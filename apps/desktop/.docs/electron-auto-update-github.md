---
name: electron-auto-update-github
description: Use when building or debugging an Electron auto-update pipeline with electron-updater against GitHub Releases - CI-derived monotonic versions (npm version + github.run_number), electron-builder publish config (releaseType must not be draft), latest.yml/blockmap artifacts, kiosk-safe update UX gated to a login screen, sticky downloaded-state guards against lost IPC events, quitAndInstall flows, publisherName breaking unsigned builds, dev testing with FORCE_UPDATE_CHECK and dev-app-update.yml, or updates that silently re-download without prompting.
---

# Auto-Update (Electron client)

How the WCL exam client keeps itself up to date. It uses
[`electron-updater`](https://www.electron.build/auto-update) against **GitHub
Releases**: every push to `main` that touches the client publishes a new
Windows build, and installed clients download and apply it on their next
launch — but only ever on the **login screen**, never mid-exam.

- **Client:** [`app/client/`](../app/client/)
- **Main-process wiring:** [`src/main/updater.ts`](../app/client/src/main/updater.ts)
- **Renderer UI:** [`src/renderer/src/components/Updates.tsx`](../app/client/src/renderer/src/components/Updates.tsx)
- **Preload bridge:** [`src/preload/index.ts`](../app/client/src/preload/index.ts)
- **Build/publish config:** [`electron-builder.yml`](../app/client/electron-builder.yml)
- **CI:** [`.github/workflows/release-client.yml`](../.github/workflows/release-client.yml)

---

## 1. The release pipeline

Version numbers are **not** committed. CI derives a monotonic version from the
run number, so every push out-ranks the last published release without creating
a commit loop.

```yaml
# .github/workflows/release-client.yml
on:
  push:
    branches: [main]
    paths:                          # docs-only edits never ship an update
      - 'app/client/src/**'
      - 'app/client/package.json'
      - 'app/client/electron-builder.yml'
      # …
jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
      - run: bun install --frozen-lockfile
      - name: Set build version
        run: npm version "1.0.${{ github.run_number }}" --no-git-tag-version --allow-same-version
      - run: bun run build
      - name: Build and publish Windows installer
        run: bunx electron-builder --win --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

`--publish always` uploads three artifacts to a GitHub Release:

| Artifact | Purpose |
| --- | --- |
| `wcl-<version>-setup.exe` | the NSIS installer |
| `wcl-<version>-setup.exe.blockmap` | lets the updater download only changed chunks |
| `latest.yml` | the manifest the updater polls — version + file hashes |

An installed client polls `latest.yml`, compares its version, and if the
release is newer, downloads the `.exe` (verified against the hash in
`latest.yml`) and stages it.

### Publish target

```yaml
# electron-builder.yml
publish:
  owner: MasterBhuvnesh
  repo: WCL
  provider: github
  releaseType: release          # NOT draft — drafts are invisible to the updater
  updaterCacheDirName: wcl-updater
```

> **Gotcha — unsigned builds and `publisherName`.** The build is **not**
> code-signed. `publisherName` is intentionally left unset. If it were set,
> `electron-updater` would verify the downloaded installer's Authenticode
> signature against it, which always fails on an unsigned build
> (`signerCertificate: null`) and aborts *every* update — the exact cause of the
> original "downloads, then silently re-downloads on next launch" loop. Re-add
> `publisherName` only once we sign with a certificate whose CN matches.

---

## 2. Design constraints

This is a **kiosk exam client**, which drives every decision:

1. **Never interrupt an exam.** The update prompt appears on the **login screen
   only** (`!isAuthenticated`). A download that finishes mid-exam stays fully
   silent and installs on the next quit.
2. **Poll only when idle.** Update checks run only while the user is on the
   login screen. The renderer gates the poll via IPC, so no network checks fire
   on the rules page or during an exam.
3. **Survive a fire-and-forget IPC race.** The main process caches the last
   status so a terminal event (`downloaded`/`error`) that fires before the
   renderer mounts isn't lost.
4. **Make failures visible and logged.** Errors render a badge and are written
   to a persistent log file for post-mortem on a locked-down device.

---

## 3. Main process — `updater.ts`

`electron-updater` ships CommonJS; we destructure the default export so it stays
compatible with electron-vite's ESM main bundle.

```ts
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'
import pkg from 'electron-updater'

const { autoUpdater } = pkg

export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number   // 0–100 while downloading
  message?: string   // present on error
}
```

### 3a. Cache the last status (fixes the lost-terminal-event race)

The IPC push is fire-and-forget. The kiosk renderer often mounts *after* the
startup check has already reached a terminal state, so we cache the last status
and let the renderer **pull** it on mount.

```ts
let lastStatus: UpdateStatus | null = null

// Once staged, there's nothing more to do until restart. Sticky, so the periodic
// re-check (which re-emits `checking`/`not-available`) can't overwrite the
// cached `downloaded` state and make the "Restart now" prompt vanish.
let downloaded = false

function broadcast(status: UpdateStatus): void {
  // After a successful download, ignore lower-priority lifecycle noise; only a
  // fresh `downloaded` or an `error` may supersede the staged state.
  if (downloaded && status.state !== 'downloaded' && status.state !== 'error') return

  lastStatus = status
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updates:status', status)
  }
}
```

### 3b. IPC handlers, registered unconditionally

Registered even in dev so the renderer's `invoke` never rejects.

```ts
export function initAutoUpdates(): void {
  // Renderer-initiated "Restart now": quit, apply the staged update, relaunch.
  // Silent so no NSIS UI flashes on the kiosk.
  ipcMain.handle('updates:quit-and-install', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  // Replay the latest status to a renderer that subscribed after the event fired.
  ipcMain.handle('updates:get-status', () => lastStatus)

  // In dev, skip real update checks unless explicitly forced.
  const forced = process.env.FORCE_UPDATE_CHECK === '1'
  if (is.dev && !forced) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true   // fallback if the user dismisses the prompt

  // Persist updater logs to %APPDATA%/WCL/logs/main.log so failures on a
  // locked-down kiosk are diagnosable after the fact.
  log.transports.file.level = 'info'
  autoUpdater.logger = log
  // …
```

### 3c. Lifecycle events → status broadcasts

A `busy` flag prevents the 30 s poll from stacking concurrent checks.

```ts
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let busy = false

  autoUpdater.on('checking-for-update', () => { busy = true; broadcast({ state: 'checking' }) })
  autoUpdater.on('update-available', (info) => broadcast({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => { busy = false; broadcast({ state: 'not-available' }) })
  autoUpdater.on('download-progress', (p) => broadcast({ state: 'downloading', percent: Math.round(p.percent) }))

  autoUpdater.on('update-downloaded', (info) => {
    // Staged. Mark it sticky and stop polling — a later check would only re-emit
    // noise that hides the renderer's prompt.
    downloaded = true
    stopPolling()
    broadcast({ state: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    busy = false
    broadcast({ state: 'error', message: err == null ? 'unknown' : (err.stack || err).toString() })
  })
```

### 3d. Login-screen-only polling

The renderer toggles polling by screen. Disabling never cancels an in-flight
download — it finishes silently and installs on quit.

```ts
  const check = (): void => {
    if (downloaded || busy) return
    autoUpdater.checkForUpdates().catch((err) => {
      busy = false
      console.error('[updater] check failed', err)
    })
  }

  const POLL_INTERVAL = 30 * 1000
  const startPolling = (): void => {
    if (downloaded || pollTimer) return
    check()
    pollTimer = setInterval(check, POLL_INTERVAL)
  }
  const stopPolling = (): void => {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  }

  // Renderer gates this: enabled on the login page, disabled everywhere else.
  ipcMain.on('updates:set-polling', (_e, active: boolean) => {
    active ? startPolling() : stopPolling()
  })

  app.on('will-quit', stopPolling)
}
```

Wired once at startup, right after the window is created:

```ts
// src/main/index.ts
import { initAutoUpdates } from './updater'
// …
initAutoUpdates()
```

---

## 4. Preload bridge

The renderer never touches `ipcRenderer` directly — everything goes through the
`examBridge` exposed via `contextBridge`.

```ts
// src/preload/index.ts
const examBridge: ExamBridge = {
  // …
  onUpdateStatus: (cb) => {
    const listener = (_e: Electron.IpcRendererEvent, status: UpdateStatus) => cb(status)
    ipcRenderer.on('updates:status', listener)
    return () => ipcRenderer.removeListener('updates:status', listener)
  },
  // Pull the last-known status (replays an event that fired pre-mount).
  getUpdateStatus: () => ipcRenderer.invoke('updates:get-status'),
  // Apply the staged update now.
  restartToUpdate: () => ipcRenderer.invoke('updates:quit-and-install'),
  // Enable/disable the login-screen poll.
  setUpdatePolling: (active) => ipcRenderer.send('updates:set-polling', active)
}
```

| Direction | Channel | Purpose |
| --- | --- | --- |
| main → renderer (push) | `updates:status` | live lifecycle updates |
| renderer → main (invoke) | `updates:get-status` | replay last status on mount |
| renderer → main (invoke) | `updates:quit-and-install` | "Restart now" |
| renderer → main (send) | `updates:set-polling` | gate the poll to the login screen |

---

## 5. Renderer — `Updates.tsx`

Mounted globally in `AppShell`, but it renders nothing unless the user is on the
login screen.

### 5a. Subscribe, then seed from the cache

Subscribe **first**, then pull the cached status — and apply the pull only if no
live push has arrived, so a stale seed can't overwrite a fresher event.

```tsx
const { isAuthenticated } = useExam()
const [status, setStatus] = useState<UpdateStatus | null>(null)
const [dismissed, setDismissed] = useState(false)
const [restarting, setRestarting] = useState(false)
const receivedPush = useRef(false)   // guards the seed against a live push

useEffect(() => {
  const off = window.examBridge.onUpdateStatus((next) => {
    receivedPush.current = true
    if (next.state === 'downloaded') setDismissed(false)   // a fresh download re-arms the prompt
    setStatus((prev) => {
      // Belt-and-suspenders with the main-side sticky flag: once downloaded,
      // ignore lower-priority noise so the "Restart now" prompt can't be hidden.
      if (prev?.state === 'downloaded' && next.state !== 'downloaded' && next.state !== 'error') {
        return prev
      }
      return next
    })
  })

  // Replay a terminal event that fired before we subscribed.
  window.examBridge.getUpdateStatus().then((seed) => {
    if (!seed || receivedPush.current) return
    if (seed.state === 'downloaded') setDismissed(false)
    setStatus((prev) => prev ?? seed)
  }).catch(() => {})

  return off
}, [])
```

### 5b. Gate polling to the login screen

```tsx
useEffect(() => {
  window.examBridge.setUpdatePolling(!isAuthenticated)
  return () => window.examBridge.setUpdatePolling(false)
}, [isAuthenticated])

// Confined to the login screen. During/after an exam the token is set, so this
// renders nothing.
if (isAuthenticated) return null
if (!status) return null
```

### 5c. The three visible states

**Downloading** — a small progress badge:

```tsx
if (status.state === 'downloading') {
  return <motion.div className={shell}>
    <IconRotate /> <span className="text-xs">Downloading update… {status.percent ?? 0}%</span>
  </motion.div>
}
```

**Error** — a dismissible badge (also written to the log file):

```tsx
if (status.state === 'error') {
  if (dismissed) return null
  return <motion.div className="…bg-red-600…">
    <span className="text-xs">Update failed. It will retry automatically.</span>
    <button onClick={() => setDismissed(true)}>Dismiss</button>
  </motion.div>
}
```

**Downloaded** — the "Restart now?" prompt. If the invoke fails, the app stays
open and install-on-quit remains the fallback:

```tsx
const onRestart = async (): Promise<void> => {
  setRestarting(true)
  try {
    await window.examBridge.restartToUpdate()
  } catch {
    setRestarting(false)   // stayed open — let the user retry
  }
}

return <motion.div className="…bg-blue-600…">
  <IconRotate />
  <div>
    <span>Update ready</span>
    <span>Restart to install the latest version.</span>
  </div>
  <button onClick={() => setDismissed(true)} disabled={restarting}>Later</button>
  <button onClick={onRestart} disabled={restarting}>
    {restarting ? 'Restarting…' : 'Restart now'}
  </button>
</motion.div>
```

---

## 6. End-to-end flow

```
Push to main (client change)
        │
        ▼
CI: electron-builder --publish always ──▶ GitHub Release
        │                                  (latest.yml, setup.exe, .blockmap)
        ▼
Client on login screen, polling every 30 s
        │  checkForUpdates() → newer? → autoDownload
        ▼
download-progress ──▶ broadcast('downloading') ──▶ progress badge
        ▼
update-downloaded ──▶ downloaded=true, stopPolling ──▶ 'Restart now?' prompt
        │
   ┌────┴─────────────────────────┐
   ▼                              ▼
"Restart now"                  "Later" / ignored
quitAndInstall(true,true)      installs on next quit (autoInstallOnAppQuit)
   ▼
relaunches on new version
```

If a download finishes mid-exam: no UI. It installs on the next quit, and the
prompt is re-offered next time the user reaches the login screen.

---

## 7. Local testing (no packaging)

The updater supports a dev override. In `app/client/`:

1. Confirm `dev-app-update.yml` is present and local `package.json` version is
   below the latest release (it's `1.0.0`).
2. Run:
   ```bash
   FORCE_UPDATE_CHECK=1 npm run dev
   ```
3. On the **login screen**: progress badge → **"Update ready / Restart now"**
   prompt appears and *stays* (doesn't vanish on the 30 s re-check).
4. Reload the renderer (devtools) after download — the prompt reappears from
   `getUpdateStatus()`, proving the lost-event race is fixed.
5. Point `dev-app-update.yml` at a bad repo to confirm the **error badge**
   renders instead of a silent disappearance.
6. Log in / start an exam → confirm **no** update UI; return to login →
   confirm it returns.
7. Inspect `%APPDATA%/WCL/logs/main.log` for the updater lifecycle.

---

## 8. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Downloads, then re-downloads on next launch; no prompt | `publisherName` set on an unsigned build → signature verification fails. Remove it. (See §1.) |
| Prompt appears then vanishes | Regression in the sticky-`downloaded` guard (§3a / §5a) letting a `checking` push clobber the prompt. |
| No prompt after a completed download | Renderer mounted after the terminal event and the `updates:get-status` seed didn't fire (§5a). |
| Update UI appears mid-exam | `isAuthenticated` gate in `Updates.tsx` (§5b) not returning `null`. |
| Nothing published on push | The change didn't touch a path in the workflow's `paths:` filter, or the release is a **draft** (`releaseType` must be `release`). |
| Diagnosing a packaged device | Read `%APPDATA%/WCL/logs/main.log`. |

---

## 9. Source snapshots

Reference copies of the files this skill describes. If the live repo and this
note ever diverge, trust the repo — then update this section.

### `src/main/updater.ts`

Full file (`app/client/src/main/updater.ts`):

```ts
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'
import pkg from 'electron-updater'

// electron-updater ships CommonJS; destructure the default export so this stays
// compatible with electron-vite's ESM main bundle.
const { autoUpdater } = pkg

/**
 * Status pushed to the renderer over the `updates:status` channel so the UI can
 * surface progress. `state` mirrors the electron-updater lifecycle.
 */
export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  /** Target version, when known (available / downloading / downloaded). */
  version?: string
  /** 0–100 download percentage, present while `state === 'downloading'`. */
  percent?: number
  /** Human-readable error, present when `state === 'error'`. */
  message?: string
}

/**
 * Last status pushed to renderers. The IPC push is fire-and-forget, so a
 * terminal event (`downloaded` / `error`) can fire before the kiosk renderer has
 * mounted and subscribed — it would then be lost forever. We cache it here and
 * let the renderer pull it on mount via `updates:get-status`.
 */
let lastStatus: UpdateStatus | null = null

/**
 * Once an update is downloaded it's staged and there's nothing more to do until
 * restart. We mark it sticky so the periodic re-check (which re-emits `checking`
 * / `not-available`) can't overwrite the cached `downloaded` state and make the
 * renderer's "Restart now" prompt vanish.
 */
let downloaded = false

function broadcast(status: UpdateStatus): void {
  // After a successful download, ignore lower-priority lifecycle noise; only a
  // fresh `downloaded` or an `error` may supersede the staged state.
  if (downloaded && status.state !== 'downloaded' && status.state !== 'error') return

  lastStatus = status
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updates:status', status)
  }
}

/**
 * Wire background auto-updates. Update checks run every 30 s, but only while
 * the renderer is on the login screen: the renderer gates the poll via
 * `updates:set-polling` (see Updates.tsx), so no checks fire on the rules page
 * or during an exam. Once an update is downloaded the renderer shows a
 * "Restart now?" prompt — login screen only — that calls
 * `updates:quit-and-install`; if the user defers, the update still installs on
 * the next quit (`autoInstallOnAppQuit`). We never force-restart a running
 * exam.
 *
 * In dev, updates are skipped unless FORCE_UPDATE_CHECK=1 (with a
 * dev-app-update.yml present) so local runs don't hit GitHub releases.
 */
export function initAutoUpdates(): void {
  // Renderer-initiated "Restart now": quit and apply the downloaded update,
  // relaunching into the new version. Silent so no NSIS UI flashes on the
  // kiosk. Registered unconditionally (even in dev) so the invoke never
  // rejects; the renderer only calls it once an update has actually downloaded.
  ipcMain.handle('updates:quit-and-install', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  // Replay the latest status to a renderer that subscribes after the event
  // fired. Registered unconditionally so the invoke never rejects in dev.
  ipcMain.handle('updates:get-status', () => lastStatus)

  const forced = process.env.FORCE_UPDATE_CHECK === '1'
  if (is.dev && !forced) return

  autoUpdater.autoDownload = true
  // Fallback for users who dismiss the prompt: still install on the next quit.
  autoUpdater.autoInstallOnAppQuit = true
  // Persist updater logs to disk (%APPDATA%/WCL/logs/main.log and equivalents)
  // so update failures on a packaged kiosk are diagnosable after the fact.
  log.transports.file.level = 'info'
  autoUpdater.logger = log

  // Poll timer, active only while the renderer says the login screen is up.
  let pollTimer: ReturnType<typeof setInterval> | null = null
  // A check (or the download it triggered) is in flight; skip poll ticks until
  // it reaches a terminal state so 30 s ticks can't stack concurrent checks.
  let busy = false

  autoUpdater.on('checking-for-update', () => {
    busy = true
    broadcast({ state: 'checking' })
  })
  autoUpdater.on('update-available', (info) =>
    broadcast({ state: 'available', version: info.version })
  )
  autoUpdater.on('update-not-available', () => {
    busy = false
    broadcast({ state: 'not-available' })
  })
  autoUpdater.on('download-progress', (progress) =>
    broadcast({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => {
    // Staged: installs on "Restart now" (quitAndInstall) or the next quit via
    // autoInstallOnAppQuit. Mark it sticky and stop polling — a later check
    // would only re-emit noise that hides the renderer's prompt.
    downloaded = true
    stopPolling()
    broadcast({ state: 'downloaded', version: info.version })
  })
  autoUpdater.on('error', (err) => {
    busy = false
    broadcast({ state: 'error', message: err == null ? 'unknown' : (err.stack || err).toString() })
  })

  const check = (): void => {
    if (downloaded || busy) return
    // Fire-and-forget; failures surface via the 'error' event above.
    autoUpdater.checkForUpdates().catch((err) => {
      busy = false
      console.error('[updater] check failed', err)
    })
  }

  const POLL_INTERVAL = 30 * 1000
  const startPolling = (): void => {
    if (downloaded || pollTimer) return
    check()
    pollTimer = setInterval(check, POLL_INTERVAL)
  }
  const stopPolling = (): void => {
    if (pollTimer) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }

  // The renderer gates polling by screen: enabled on the login page, disabled
  // on the rules page and during/after an exam. An in-flight download is not
  // cancelled by disabling — it finishes silently and installs on quit.
  ipcMain.on('updates:set-polling', (_event, active: boolean) => {
    if (active) startPolling()
    else stopPolling()
  })

  app.on('will-quit', stopPolling)
}
```

### `src/main/index.ts`

Excerpt — the updater-relevant wiring (imports and the `initAutoUpdates()` call
inside `app.whenReady()`, after `createWindow()`):

```ts
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, shell } from 'electron'
import path, { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { lockdown, registerLockdownIpc } from './lockdown'
import { registerDevModeShortcut } from './devmode'
import { registerStoreIpc } from './store'
import { deviceId } from './fingerprint'
import { initAutoUpdates } from './updater'

// … single-instance lock, deep-link protocol registration, createWindow() …

app.whenReady().then(() => {
  electronApp.setAppUserModelId('in.wcl.desktop')

  // Remove the native application menu (kiosk lockdown).
  Menu.setApplicationMenu(null)

  registerLockdownIpc()
  registerStoreIpc()

  ipcMain.handle('app:get-device-id', () => deviceId())
  // App version (the packaged build's version, e.g. "1.0.14") for the login
  // screen's version label.
  ipcMain.handle('app:get-version', () => app.getVersion())

  // … window-control IPC handlers gated by lockdown.allowWindowControl() …

  createWindow()

  // Background auto-updates: check on startup, download silently, install on the
  // next quit and launch the new version. No-op in dev.
  initAutoUpdates()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})
```

### `electron-builder.yml`

Full file (`app/client/electron-builder.yml`) — the update-critical parts are
`publish:` at the bottom:

```yaml
appId: in.wcl.desktop
productName: WCL
asar: true
directories:
  buildResources: build
files:
  - 'out/**'
  - '!**/.vscode/*'
  - '!src/*'
  - '!electron.vite.config.{js,ts,mjs,cjs}'
  - '!{.eslintcache,eslint.config.mjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}'
  - '!{.env,.env.*,.npmrc,pnpm-lock.yaml}'
  - '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}'
asarUnpack:
  - resources/**
win:
  executableName: wcl
  icon: build/icon.ico
  target:
    - nsis
nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  artifactName: ${name}-${version}-setup.${ext}
  shortcutName: ${productName}
  uninstallDisplayName: ${productName}
  createDesktopShortcut: always
mac:
  entitlementsInherit: build/entitlements.mac.plist
  extendInfo:
    - NSCameraUsageDescription: Application requests access to the device's camera.
    - NSMicrophoneUsageDescription: Application requests access to the device's microphone.
    - NSDocumentsFolderUsageDescription: Application requests access to the user's Documents folder.
    - NSDownloadsFolderUsageDescription: Application requests access to the user's Downloads folder.
  notarize: false
dmg:
  artifactName: ${name}-${version}.${ext}
linux:
  target:
    - AppImage
    - snap
    - deb
  maintainer: electronjs.org
  category: Utility
appImage:
  artifactName: ${name}-${version}.${ext}
npmRebuild: false
publish:
  owner: MasterBhuvnesh
  repo: WCL
  provider: github
  # Publish a real release, not a draft. Drafts are invisible in the Releases
  # panel AND unreadable by electron-updater, so auto-update needs this.
  releaseType: release
  updaterCacheDirName: wcl-updater
  # NOTE: publisherName is intentionally NOT set. The build is unsigned, and
  # setting publisherName makes electron-updater verify the downloaded
  # installer's Authenticode signature against it — which always fails on an
  # unsigned build (signerCertificate: null), aborting every auto-update.
  # Re-add it ONLY once we code-sign with a certificate whose CN matches.

electronDownload:
  mirror: https://npmmirror.com/mirrors/electron/
```

### `.github/workflows/release-client.yml`

Full file:

```yaml
name: Release Client

# Publishes a new Windows build to GitHub Releases on every push to main that
# touches the client. electron-updater on installed clients reads the resulting
# `latest.yml` + installer and applies the update on their next launch.
on:
  push:
    branches: [main]
    # Only rebuild on client code/asset changes — not docs (README) or deploy
    # scripts — so a docs edit never ships a needless update to every device.
    paths:
      - 'app/client/src/**'
      - 'app/client/resources/**'
      - 'app/client/build/**'
      - 'app/client/package.json'
      - 'app/client/electron-builder.yml'
      - 'app/client/electron.vite.config.ts'
      - '.github/workflows/release-client.yml'
  # Manual trigger for re-publishing without a code change.
  workflow_dispatch:

# Only the newest release build for a given ref matters; cancel older ones.
concurrency:
  group: release-client-${{ github.ref }}
  cancel-in-progress: true

jobs:
  release:
    runs-on: windows-latest
    defaults:
      run:
        working-directory: app/client
    permissions:
      # Required for electron-builder to create the GitHub Release via GITHUB_TOKEN.
      contents: write
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.8"

      - run: bun install --frozen-lockfile

      # Derive a monotonically increasing version from the run number so every
      # push out-ranks the previous release. Not committed back to the repo —
      # only the published artifact carries it, which avoids a CI loop.
      - name: Set build version
        run: npm version "1.0.${{ github.run_number }}" --no-git-tag-version --allow-same-version

      - run: bun run build # typecheck + electron-vite build
        env:
          # Baked into the renderer at build time (import.meta.env.VITE_API_BASE).
          VITE_API_BASE: ${{ vars.VITE_API_BASE || 'https://api.rbuexam.in' }}

      - name: Build and publish Windows installer
        run: bunx electron-builder --win --publish always
        env:
          # Built-in token; electron-builder uses it to create the Release.
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### `dev-app-update.yml`

Used for local testing (§7): points `autoUpdater` at the real release feed
while running unpackaged with `FORCE_UPDATE_CHECK=1`.

```yaml
owner: MasterBhuvnesh
repo: WCL
provider: github
repository: 'https://github.com/MasterBhuvnesh/WCL'
updaterCacheDirName: wcl-updater
branch: main
releaseType: release
private: false
```

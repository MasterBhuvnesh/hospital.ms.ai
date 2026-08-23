import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain } from 'electron'
import log from 'electron-log'
import pkg from 'electron-updater'

// electron-updater ships CommonJS; destructure the default export so this stays
// compatible with electron-vite's ESM main bundle.
const { autoUpdater } = pkg

export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  message?: string
}

let lastStatus: UpdateStatus | null = null
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

export function initAutoUpdates(): void {
  ipcMain.handle('updates:quit-and-install', () => {
    autoUpdater.quitAndInstall(true, true)
  })

  ipcMain.handle('updates:get-status', () => lastStatus)

  const forced = process.env.FORCE_UPDATE_CHECK === '1'
  if (is.dev && !forced) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  log.transports.file.level = 'info'
  autoUpdater.logger = log

  let pollTimer: ReturnType<typeof setInterval> | null = null
  let busy = false

  autoUpdater.on('checking-for-update', () => {
    busy = true
    broadcast({ state: 'checking' })
  })
  autoUpdater.on('update-available', (info) => broadcast({ state: 'available', version: info.version }))
  autoUpdater.on('update-not-available', () => {
    busy = false
    broadcast({ state: 'not-available' })
  })
  autoUpdater.on('download-progress', (progress) =>
    broadcast({ state: 'downloading', percent: Math.round(progress.percent) })
  )
  autoUpdater.on('update-downloaded', (info) => {
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

  // The renderer gates polling by screen: enabled on the login screen only.
  // An in-flight download is not cancelled by disabling - it finishes silently
  // and installs on quit.
  ipcMain.on('updates:set-polling', (_event, active: boolean) => {
    if (active) startPolling()
    else stopPolling()
  })

  app.on('will-quit', stopPolling)
}

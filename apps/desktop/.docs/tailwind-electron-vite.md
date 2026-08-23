---
name: tailwind-electron-vite
description: 'Set up Tailwind CSS v4 in an Electron app built with electron-vite (@quick-start/electron scaffold), and rebrand the scaffold for a new GitHub repo with working auto-update and CI/CD. Use when: adding Tailwind to Electron, configuring electron.vite.config.ts renderer plugins, scaffolding with npm/pnpm create @quick-start/electron, fixing electron-builder publish config, GitHub Releases auto-update not working, or writing release workflows for Electron apps.'
---

# Tailwind CSS v4 + electron-vite Setup & Rebranding

## When to Use

- Adding Tailwind CSS v4 to an Electron app built with electron-vite
- Scaffolding a new Electron app with `npm create @quick-start/electron` / `pnpm create @quick-start/electron`
- Rebranding the scaffold for your own GitHub repo (owner/repo fields, auto-update, CI/CD)
- Debugging: auto-update never fires, releases are drafts, updates abort on signature check

## Part 1 — Scaffold

```bash
# npm
npm create @quick-start/electron@latest
# pnpm
pnpm create @quick-start/electron
```

Prompt answers: framework (React/Vue/Svelte/Vanilla), TypeScript yes,
**Electron updater plugin yes** (installs `electron-updater` + generates `dev-app-update.yml`),
download mirror proxy only if behind restrictive networks.

Resulting layout:

```
├── electron.vite.config.ts     # one config: main + preload + renderer
├── electron-builder.yml        # packaging / publishing
├── dev-app-update.yml          # DEV-only update feed
├── tsconfig.node.json          # main + preload (Node)
├── tsconfig.web.json           # renderer (browser)
└── src/{main,preload,renderer}
```

## Part 2 — Tailwind CSS v4

v4 differs from v3: **no postcss.config, no autoprefixer, no content array**.
Tailwind runs as a native Vite plugin and discovers classes automatically.

### Install

```bash
bun add tailwindcss @tailwindcss/vite   # or npm/pnpm install
```

### Register the plugin — renderer ONLY

The critical Electron-specific step: `main` and `preload` are Node contexts;
Tailwind belongs only in the `renderer` block of `electron.vite.config.ts`.

```ts
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import { resolve } from 'path'

export default defineConfig({
  main: { plugins: [externalizeDepsPlugin()] },
  preload: { plugins: [externalizeDepsPlugin()] },
  renderer: {
    resolve: { alias: { '@renderer': resolve('src/renderer/src') } },
    plugins: [react(), tailwindcss()]
  }
})
```

### CSS entry — `src/renderer/src/styles/globals.css`

Configure in CSS, not JS:

```css
@import 'tailwindcss';

/* Class-based dark mode (toggle .dark on <html>), not media-query */
@custom-variant dark (&:is(.dark *));

/* Bundle fonts locally — desktop apps must work offline; no Google Fonts CDN */
@font-face {
  font-family: 'Inter';
  src: url('../assets/fonts/Inter.ttf') format('truetype');
  font-weight: 100 900;
  font-display: swap;
}
```

Then define design tokens as CSS variables (`--background`, `--primary`, `--border`,
etc.) in `:root` and `.dark`, mapped via a `@theme inline` block to utilities like
`bg-background`. Copy the shadcn/ui token set if using shadcn-style components.

Import once in the renderer entry: `import './styles/globals.css'`.

### Optional config file

`tailwind.config.ts` is optional in v4 — keep only for editor tooling:

```ts
import type { Config } from 'tailwindcss'

export default {
  theme: { extend: { fontFamily: { sans: ['Inter', 'sans-serif'] } } }
} satisfies Config
```

### Class merging helper — `src/renderer/src/lib/utils.ts`

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(...inputs))
}
```

Companion deps for shadcn/ui-style components: `clsx`, `tailwind-merge`,
`class-variance-authority`, `lucide-react`, `radix-ui`.

## Part 3 — Rebrand for Your Repo

The scaffold ships placeholder metadata. Change ALL of these or auto-update breaks.

### `package.json`

```json
{
  "name": "my-app",
  "productName": "My App",
  "homepage": "https://github.com/<owner>/<repo>",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/<owner>/<repo>.git",
    "directory": "app/client"
  }
}
```

- `name`: lowercase, no spaces — becomes artifact filename
- `directory`: required in monorepos where the client isn't at repo root

### `electron-builder.yml` — publish target

```yaml
appId: com.yourdomain.app    # reverse-domain, permanent once users install
productName: My App
publish:
  owner: <owner>
  repo: <repo>
  provider: github
  releaseType: release       # NOT draft
  updaterCacheDirName: my-app-updater
```

**Hard-won gotchas:**

1. **`releaseType: release`, never `draft`** — draft releases are invisible to
   `electron-updater`; installed clients never see updates.
2. **Do NOT set `publisherName` on unsigned builds** — electron-updater verifies the
   downloaded installer's Authenticode signature against it; on unsigned builds
   (`signerCertificate: null`) every update aborts. Add only after code signing.
3. Mirror the same owner/repo in `dev-app-update.yml` (dev-only feed) or dev update
   checks fail confusingly.

## Part 4 — CI/CD

### CI job (compile check only)

```yaml
client:
  runs-on: ubuntu-latest
  defaults:
    run:
      working-directory: app/client   # monorepo
  env:
    ELECTRON_SKIP_BINARY_DOWNLOAD: "1"  # build never launches Electron; skips ~100MB download
  steps:
    - uses: actions/checkout@v4
    - run: bun install --frozen-lockfile
    - run: bun run validate   # format + lint + typecheck (dual tsconfig)
    - run: bun run build      # typecheck + electron-vite build
```

### Release workflow (`.github/workflows/release-client.yml`)

```yaml
on:
  push:
    branches: [main]
    paths:                    # docs edits must NOT ship updates to devices
      - 'app/client/src/**'
      - 'app/client/package.json'
      - 'app/client/electron-builder.yml'
      - '.github/workflows/release-client.yml'
  workflow_dispatch:
concurrency:
  group: release-client-${{ github.ref }}
  cancel-in-progress: true
jobs:
  release:
    runs-on: windows-latest          # must match target OS
    defaults:
      run:
        working-directory: app/client
    permissions:
      contents: write                # required to create the GitHub Release
    steps:
      - uses: actions/checkout@v4
      - run: bun install --frozen-lockfile
      # Monotonic version from run number; NOT committed back → avoids CI loop
      - run: npm version "1.0.${{ github.run_number }}" --no-git-tag-version --allow-same-version
      - run: bun run build
        env:
          VITE_API_BASE: ${{ vars.VITE_API_BASE }}   # VITE_* vars bake into renderer bundle
      - run: bunx electron-builder --win --publish always
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}      # built-in token suffices for public repos
```

Flow: push → build on matching OS → `--publish always` uploads installer +
`latest.yml` to GitHub Releases → installed clients' `electron-updater` reads
`latest.yml` on launch → downloads + installs update.

## Checklist for a New Project

- [ ] Scaffold via `npm create @quick-start/electron@latest`
- [ ] `tailwindcss()` in **renderer block only** of `electron.vite.config.ts`
- [ ] `@import 'tailwindcss'` + `@custom-variant dark` in renderer CSS entry
- [ ] Fonts bundled locally under `src/renderer/src/assets/fonts/`
- [ ] `package.json`: name/productName/homepage/repository (+directory in monorepo)
- [ ] `electron-builder.yml`: appId, productName, publish.owner/repo, `releaseType: release`
- [ ] Same owner/repo mirrored in `dev-app-update.yml`
- [ ] No `publisherName` unless code-signed
- [ ] CI: `ELECTRON_SKIP_BINARY_DOWNLOAD: "1"` + validate + build
- [ ] Release: matching OS runner, `contents: write`, `GH_TOKEN`, `--publish always`, `paths:` filter

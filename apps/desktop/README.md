# Atelier Health — Desktop Workstation

The **staff workstation** for the Atelier Health platform. While patients use the mobile app and web portal, hospital employees use this Electron desktop app to run the physical queue day-to-day.

## Who uses it

| Role | What they see | Key actions |
|---|---|---|
| **Receptionist** | Reception desk | Walk-in registration, issue queue tokens, call/skip/recall patients, mark no-shows |
| **Doctor** | My clinic | See called patients, start consultations, write SOAP notes, prescribe + sign (immutable PDF) |
| **Hospital Admin** | Users & roles | Manage staff accounts, view audit log, monitor live domain events, break-glass access |

## Why it's a separate app (not just the web)

Three things a browser can't do:

1. **Thermal printer** — raw ESC/POS to print queue tokens at the front desk
2. **Barcode scanner / HID** — patient ID card scanning
3. **Controlled auto-update** — silent updates on unattended reception machines, applied on quit never mid-consultation

## The core workflow it enables

```
Patient walks in
  → Reception registers them, issues token #N (desktop)
  → Patient's phone buzzes with token #N (mobile push/SMS)
  → Doctor clicks "Call next" (desktop)
  → Patient sees position drop in real time (mobile)
  → Doctor writes notes + signs prescription (desktop)
  → Patient gets the PDF on their phone
  → Reception generates invoice + collects payment (desktop)
```

The desktop is the **operational hub** — the thing that makes the physical queue actually move. The mobile app is for patients to watch; the desktop is for staff to drive.

## Tech stack

- Electron 39 + electron-vite 5 (main / preload / renderer)
- React 19 + TypeScript strict
- Tailwind CSS v4 (via `@tailwindcss/vite`, renderer only)
- shadcn/ui-style components (OKLCH tokens matching the dashboard design system)
- electron-updater (GitHub Releases, login-screen-gated polling)

## Run

```powershell
pnpm install
pnpm dev
```

Sign in with a staff account (e.g. `reception@atelier.local` / `Demo@12345` or `asha@atelier.local` / `Demo@12345`).

## Build

```powershell
pnpm build:win       # Windows installer
pnpm build:unpack    # unpacked dir (dev)
```

## Auto-update

Uses `electron-updater` against GitHub Releases. Checks every 30s while the login screen is visible, downloads silently, prompts "Restart now" (login screen only), installs on quit as fallback. In dev, set `FORCE_UPDATE_CHECK=1` to test against the real feed.

See [`.docs/electron-auto-update-github.md`](.docs/electron-auto-update-github.md) for the full pipeline.

# apps/desktop

electron-vite with React. **One application, one window mode per staff role.**

Scaffolded with `pnpm create @quick-start/electron` (React, TypeScript). A hospital installs one MSI, not five.

```
electron.vite.config.ts     main / preload / renderer build
electron-builder.yml        packaging and the update feed
src/
  main/                     windows, printer IPC, auto-updater
  preload/                  contextBridge. The ONLY privileged surface
  renderer/src/modules/
    reception/              intake, tokens, queue control, billing counter
    doctor/                 queue, patient sheet, consultation, prescribing
    nurse/                  vitals, preparation, triage flag        (P3)
    pharmacy/               dispensing, inventory                    (P3)
    laboratory/             collection, results, verification        (P3)
```

## Why Electron at all

Three things a browser cannot do:

1. **Thermal printer access.** Raw ESC/POS bytes to a USB or serial printer. A PDF print dialog on a desk that prints 300 tokens a day is a workflow failure.
2. **Barcode scanner and HID access** for patient ID cards.
3. **Controlled auto-update** on unattended machines no hospital IT department manages.

## Security

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. **Do not loosen the template's defaults.** Every privileged capability goes through `src/preload` as a narrow, explicit IPC channel.

## Auto-update

Check on launch and every four hours, download in the background, **apply on quit and never mid-consultation**, staged rollout percentage, `stable` and `beta` channels.

A **Windows EV code-signing certificate is a hard prerequisite.** Unsigned installers are blocked by SmartScreen and unsigned auto-update is a non-starter on managed hospital machines.

## Offline

Reads come from a cache. Walk-in registration and check-in are **queued locally and replayed with idempotency keys** when connectivity returns, so the desk keeps working through an outage. Payment capture is explicitly disabled offline, with a clear message.

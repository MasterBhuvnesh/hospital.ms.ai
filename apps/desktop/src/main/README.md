# apps/desktop/src/main

The Electron main process. Node runs here, so this is the only place with real operating-system access.

Owns: window creation and the role mode chosen at launch, thermal printer IPC (raw ESC/POS bytes), HID and barcode scanner access, the auto-updater, and crash reporting.

**Nothing here is reachable from the renderer except through an explicit channel declared in `../preload`.**

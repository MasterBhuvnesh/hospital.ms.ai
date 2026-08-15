# apps/desktop/src/preload

The `contextBridge`. **This is the entire privileged surface of the application.**

Expose narrow, named operations (`printToken(payload)`), never a general capability (`invoke(channel, args)`) and never a Node module. Anything exposed here is reachable by any script the renderer loads.

`contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`. **Do not loosen these to make something work.** If a renderer feature needs OS access, add one specific channel here instead.

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Types mirrored from src/main/updater.ts
export interface UpdateStatus {
  state: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  message?: string
}

const desktopBridge = {
  getAppVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  onUpdateStatus: (cb: (status: UpdateStatus) => void): (() => void) => {
    const listener = (_e: Electron.IpcRendererEvent, status: UpdateStatus): void => cb(status)
    ipcRenderer.on('updates:status', listener)
    return () => ipcRenderer.removeListener('updates:status', listener)
  },
  getUpdateStatus: (): Promise<UpdateStatus | null> => ipcRenderer.invoke('updates:get-status'),
  restartToUpdate: (): Promise<void> => ipcRenderer.invoke('updates:quit-and-install'),
  setUpdatePolling: (active: boolean): void => ipcRenderer.send('updates:set-polling', active)
}

export type DesktopBridge = typeof desktopBridge

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('desktopBridge', desktopBridge)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.desktopBridge = desktopBridge
}

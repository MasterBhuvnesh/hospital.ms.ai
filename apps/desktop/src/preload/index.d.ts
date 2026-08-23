import { ElectronAPI } from '@electron-toolkit/preload'
import type { DesktopBridge } from './index'

declare global {
  interface Window {
    electron: ElectronAPI
    desktopBridge: DesktopBridge
  }
}

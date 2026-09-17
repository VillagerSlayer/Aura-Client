import { ipcMain, type BrowserWindow } from 'electron'
import { accountManager } from './accountManager'
import type { AuthState } from './types'

export function registerAuthIpc(mainWindow: BrowserWindow): void {
  ipcMain.handle('auth:get-state', (): AuthState => accountManager.getState())

  ipcMain.handle('auth:login', async (): Promise<void> => {
    await accountManager.login()
  })

  ipcMain.handle('auth:logout', async (): Promise<void> => {
    await accountManager.logout()
  })

  accountManager.onChange((state) => {
    if (mainWindow.isDestroyed()) return
    mainWindow.webContents.send('auth:state-changed', state)
  })
}

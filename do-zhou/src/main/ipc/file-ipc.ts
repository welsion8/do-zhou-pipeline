import { ipcMain } from 'electron'
import { fileService } from '../services/file-service'
import { projectService } from '../services/project-service'
import { trashService } from '../services/trash-service'

export function registerFileIpc(): void {
  ipcMain.handle('file:read', (_e, p: string) => fileService.readFile(p))
  ipcMain.handle('file:write', (_e, p: string, c: string) => fileService.writeFile(p, c))
  ipcMain.handle('file:list', (_e, p: string) => fileService.listDir(p))
  ipcMain.handle('file:delete', (_e, p: string) => fileService.delete(p))
  ipcMain.handle('file:rename', (_e, o: string, n: string) => fileService.rename(o, n))
  ipcMain.handle('file:mkdir', (_e, p: string) => fileService.mkdir(p))
  ipcMain.handle('file:exists', (_e, p: string) => fileService.exists(p))

  ipcMain.handle('project:create', (_e, n: string, s: string) => projectService.create(n, s, fileService.getDataRoot()))
  ipcMain.handle('project:list', (_e, s?: string) => projectService.list(s))
  ipcMain.handle('project:get', (_e, n: string) => projectService.get(n))
  ipcMain.handle('project:delete', (_e, n: string) => projectService.delete(n))
  ipcMain.handle('project:rename', (_e, o: string, n: string) => projectService.rename(o, n))
  ipcMain.handle('project:listFiles', (_e, n: string) => projectService.listFiles(n))

  ipcMain.handle('trash:list', () => trashService.listTrash())
  ipcMain.handle('trash:restore', (_e, n: string, s: string) => trashService.restore(n, s as 'overwrite' | 'rename'))
  ipcMain.handle('trash:empty', () => trashService.empty())

  ipcMain.handle('app:getDataRoot', () => fileService.getDataRoot())
}

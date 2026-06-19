import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { registerFileIpc } from '../src/main/ipc/file-ipc'
import { registerApiConfigIpc } from '../src/main/ipc/api-config-ipc'
import { registerEngineIpc } from '../src/main/ipc/engine-ipc'
import { ApiConfigService } from '../src/main/services/api-config-service'
import path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200, height: 800, minWidth: 800, minHeight: 600,
    frame: false, titleBarStyle: 'hidden', backgroundColor: '#0F0F11',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.on('window:minimize', () => mainWindow?.minimize())
ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) { mainWindow.unmaximize() } else { mainWindow?.maximize() }
})
ipcMain.on('window:close', () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)

registerFileIpc()

const dataRoot = path.join(app.getPath('userData'), 'do-zhou-data')
const apiConfigService = new ApiConfigService(dataRoot)
registerApiConfigIpc(apiConfigService)
registerEngineIpc(dataRoot)
// Phase 10: Skill 管理
import { SkillService } from '../src/main/services/skill-service'
import { registerSkillIpc } from '../src/main/ipc/skill-ipc'
const skillService = new SkillService(dataRoot)
registerSkillIpc(skillService)
// Phase 11+12: 引擎+设置+备份
import { SettingsService } from '../src/main/services/settings-service'
import { BackupService } from '../src/main/services/backup-service'
const settingsService = new SettingsService(dataRoot)
const backupService = new BackupService(dataRoot)
ipcMain.handle('settings:get', () => settingsService.get())
ipcMain.handle('settings:save', (_e, s) => settingsService.save(s))
ipcMain.handle('settings:reset', () => settingsService.reset())
ipcMain.handle('backup:list', () => backupService.listBackups())
ipcMain.handle('backup:create', (_e, projectPath: string, name: string) => backupService.backup(projectPath, name))
ipcMain.handle('backup:restore', (_e, backupName: string, targetPath: string) => backupService.restore(backupName, targetPath))
ipcMain.handle('backup:prune', (_e, maxCount: number) => { backupService.prune(maxCount) })
// 引擎 IPC
ipcMain.handle('engine:chatStream', async (_e, req) => {
  const { createEngine } = await import('../src/main/engine/engine-factory')
  return createEngine(req)
})
// 文件工具执行层（Read/Write/Glob/Grep — 供 Agent 使用）
// 相对路径自动解析到 dataRoot
const resolveToolPath = (p: string) => path.isAbsolute(p) ? p : path.resolve(dataRoot, p)
ipcMain.handle('tool:readFile', (_e, filePath: string) => {
  try { return fs.readFileSync(resolveToolPath(filePath), 'utf-8') } catch { return null }
})
ipcMain.handle('tool:writeFile', (_e, filePath: string, content: string) => {
  const fp = resolveToolPath(filePath)
  const dir = path.dirname(fp); if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(fp, content, 'utf-8'); return true
})
ipcMain.handle('tool:glob', (_e, pattern: string) => {
  const fp = resolveToolPath(pattern)
  const dir = path.dirname(fp); if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir).filter(f => f.includes(path.basename(fp).replace(/\*/g, '')))
})
ipcMain.handle('tool:grep', (_e, filePath: string, regex: string) => {
  try { const c = fs.readFileSync(resolveToolPath(filePath), 'utf-8'); const lines = c.split('\n'); const results = []; for (let i = 0; i < lines.length; i++) { if (new RegExp(regex).test(lines[i])) results.push({ line: i + 1, content: lines[i] }) } return results } catch { return [] }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })

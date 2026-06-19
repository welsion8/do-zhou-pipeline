/**
 * Skill IPC — 注册 Skill 管理相关的 IPC handler
 */

import { ipcMain, dialog } from 'electron'
import * as path from 'path'
import type { SkillService, SkillEntry } from '../services/skill-service'

export function registerSkillIpc(service: SkillService): void {
  // 获取所有 Skill
  ipcMain.handle('skill:getAll', (): SkillEntry[] => service.getAll())

  // 创建 Skill
  ipcMain.handle('skill:create', (_e, name: string, category: string, stages: string[]): SkillEntry => {
    return service.create(name, category, stages)
  })

  // 导入 Skill（返回冲突信息供前端弹窗）
  ipcMain.handle('skill:import', async (_e): Promise<any> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择 Skill 文件夹',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    try {
      return await service.importFromFolder(result.filePaths[0])
    } catch (e: any) {
      if (e.message?.includes('已存在')) {
        return { conflict: true, sourcePath: result.filePaths[0], existingName: path.basename(result.filePaths[0]), message: e.message }
      }
      throw e
    }
  })

  // 导出 Skill
  ipcMain.handle('skill:export', async (_e, skillName: string): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: '选择导出目录',
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return service.exportToFolder(skillName, result.filePaths[0])
  })

  // 删除 Skill
  ipcMain.handle('skill:delete', (_e, skillName: string, force: boolean): { deleted: boolean; orphanProjects: number } => {
    return service.delete(skillName, force)
  })

  // 重命名 Skill
  ipcMain.handle('skill:rename', (_e, oldName: string, newName: string): SkillEntry => {
    return service.rename(oldName, newName)
  })

  // 导入冲突处理：覆盖现有 Skill
  ipcMain.handle('skill:importOverwrite', async (_e, sourcePath: string, existingName: string): Promise<SkillEntry> => {
    // 先删除旧的，再导入
    service.delete(existingName, true)
    return service.importFromFolder(sourcePath, existingName)
  })

  // 导入冲突处理：保留两者
  ipcMain.handle('skill:importRename', async (_e, sourcePath: string, newName: string): Promise<SkillEntry> => {
    return service.importFromFolder(sourcePath, newName)
  })
}

/**
 * 备份服务 — ZIP 备份 + 恢复
 */

import * as fs from 'fs'
import * as path from 'path'

export class BackupService {
  private dataRoot: string
  private backupDir: string

  constructor(dataRoot: string) {
    this.dataRoot = dataRoot
    this.backupDir = path.join(dataRoot, 'Backups')
    if (!fs.existsSync(this.backupDir)) fs.mkdirSync(this.backupDir, { recursive: true })
  }

  /** 备份项目 */
  backup(projectPath: string, projectName: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19)
    const backupName = `${projectName}_${timestamp}`
    const backupPath = path.join(this.backupDir, backupName)

    // 复制目录
    this.copyDirSync(projectPath, backupPath)
    return backupPath
  }

  /** 列出所有备份 */
  listBackups(): { name: string; path: string; date: string }[] {
    if (!fs.existsSync(this.backupDir)) return []
    return fs.readdirSync(this.backupDir, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => {
        const stat = fs.statSync(path.join(this.backupDir, e.name))
        return { name: e.name, path: path.join(this.backupDir, e.name), date: stat.birthtime.toISOString() }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }

  /** 从备份恢复 */
  restore(backupName: string, targetPath: string): string {
    const backupPath = path.join(this.backupDir, backupName)
    if (!fs.existsSync(backupPath)) throw new Error(`备份 "${backupName}" 不存在`)

    // 覆盖目标目录
    if (fs.existsSync(targetPath)) fs.rmSync(targetPath, { recursive: true, force: true })
    this.copyDirSync(backupPath, targetPath)
    return targetPath
  }

  /** 清理旧备份（保留最近 N 份） */
  prune(maxCount: number): void {
    const backups = this.listBackups()
    if (backups.length <= maxCount) return
    for (const b of backups.slice(maxCount)) {
      fs.rmSync(b.path, { recursive: true, force: true })
    }
  }

  private copyDirSync(src: string, dest: string): void {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, entry.name)
      const d = path.join(dest, entry.name)
      if (entry.isDirectory()) this.copyDirSync(s, d)
      else fs.copyFileSync(s, d)
    }
  }
}

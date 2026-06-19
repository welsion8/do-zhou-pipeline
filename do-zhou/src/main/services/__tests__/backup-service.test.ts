import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { BackupService } from '../backup-service'

let tmpDir: string
let service: BackupService

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-backup-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  service = new BackupService(tmpDir)
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('BackupService', () => {
  function createProject(name: string, files: Record<string, string>) {
    const dir = path.join(tmpDir, name)
    fs.mkdirSync(dir, { recursive: true })
    for (const [fn, content] of Object.entries(files)) {
      const fp = path.join(dir, fn)
      fs.mkdirSync(path.dirname(fp), { recursive: true })
      fs.writeFileSync(fp, content)
    }
    return dir
  }

  describe('备份', () => {
    it('备份项目 → 创建备份目录', () => {
      const projectDir = createProject('my-project', { 'outline.md': '# Outline', 'chapters/Chapter-01.md': '# Ch1' })
      const backupPath = service.backup(projectDir, 'my-project')
      expect(fs.existsSync(backupPath)).toBe(true)
      expect(fs.existsSync(path.join(backupPath, 'outline.md'))).toBe(true)
      expect(fs.existsSync(path.join(backupPath, 'chapters', 'Chapter-01.md'))).toBe(true)
    })

    it('多次备份 → 都创建成功', () => {
      const projectDir = createProject('p2', { 'a.txt': 'a' })
      const b1 = service.backup(projectDir, 'p2')
      const b2 = service.backup(projectDir, 'p2')
      expect(fs.existsSync(b1)).toBe(true)
      expect(fs.existsSync(b2)).toBe(true)
    })
  })

  describe('列出备份', () => {
    it('空目录 → 空列表', () => {
      expect(service.listBackups()).toHaveLength(0)
    })

    it('有备份 → 返回列表', () => {
      const d = createProject('p', { 'f.txt': 'f' })
      const b1 = service.backup(d, 'p')
      expect(service.listBackups().length).toBe(1)
      expect(fs.existsSync(b1)).toBe(true)
    })
  })

  describe('恢复', () => {
    it('恢复备份 → 覆盖目标目录', () => {
      const src = createProject('src', { 'file.md': 'original' })
      const backupPath = service.backup(src, 'src')
      // 删除原文件，再恢复
      fs.rmSync(src, { recursive: true, force: true })
      const restored = service.restore(path.basename(backupPath), src)
      expect(fs.existsSync(path.join(restored, 'file.md'))).toBe(true)
    })

    it('恢复不存在的备份 → 抛出错误', () => {
      expect(() => service.restore('nonexistent', '/some/path')).toThrow('不存在')
    })
  })

  describe('清理旧备份', () => {
    it('保留最近 N 份', () => {
      const d = createProject('p', { 'f.txt': 'f' })
      for (let i = 0; i < 10; i++) {
        // 用不同名字模拟多次备份
        fs.mkdirSync(path.join(service['backupDir'], `p_2026-01-${String(i+1).padStart(2,'0')}T00-00-00`), { recursive: true })
      }
      expect(service.listBackups().length).toBe(10)
      service.prune(3)
      expect(service.listBackups().length).toBe(3)
    })

    it('备份数 ≤ 上限 → 不删除', () => {
      const d = createProject('p', { 'f.txt': 'f' })
      service.backup(d, 'p')
      service.prune(5)
      expect(service.listBackups().length).toBe(1)
    })
  })
})

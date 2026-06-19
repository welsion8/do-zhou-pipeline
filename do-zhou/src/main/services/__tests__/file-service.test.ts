import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Mock Electron — 让 app.getPath 返回临时目录
let tmpDir: string

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => tmpDir),
    name: 'do-zhou-test',
  },
}))

import { fileService } from '../file-service'

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-fs-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('fileService', () => {
  describe('写入和读取', () => {
    it('writeFile + readFile → 内容一致', async () => {
      await fileService.writeFile('test.txt', 'hello world')
      const content = await fileService.readFile('test.txt')
      expect(content).toBe('hello world')
    })
  })

  describe('目录操作', () => {
    it('mkdir + exists', async () => {
      await fileService.mkdir('subdir')
      const exists = await fileService.exists('subdir')
      expect(exists).toBe(true)
    })

    it('listDir → 列出目录内容', async () => {
      await fileService.mkdir('mydir')
      await fileService.writeFile('mydir/a.txt', 'a')
      await fileService.writeFile('mydir/b.txt', 'b')
      const entries = await fileService.listDir('mydir')
      expect(entries.length).toBe(2)
    })
  })

  describe('重命名和删除', () => {
    it('rename 后旧路径不存在', async () => {
      await fileService.writeFile('old.txt', 'old')
      await fileService.rename('old.txt', 'new.txt')
      expect(await fileService.exists('old.txt')).toBe(false)
      expect(await fileService.exists('new.txt')).toBe(true)
    })

    it('delete 后文件消失', async () => {
      await fileService.writeFile('del.txt', 'bye')
      await fileService.delete('del.txt')
      expect(await fileService.exists('del.txt')).toBe(false)
    })
  })

  describe('错误处理', () => {
    it('读不存在文件 → 抛出错误', async () => {
      await expect(fileService.readFile('nonexistent.txt')).rejects.toThrow()
    })

    it('写无效路径 → 静默返回 undefined', async () => {
      const result = await fileService.writeFile('', 'empty')
      expect(result).toBeUndefined()
    })
  })
})

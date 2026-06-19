import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => tmpDir), name: 'do-zhou-test' },
}))

import { trashService } from '../trash-service'
import { fileService } from '../file-service'

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-trash-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('trashService (mock Electron)', () => {
  it('listTrash → 空回收站返回 []', async () => {
    const items = await trashService.listTrash()
    expect(items).toEqual([])
  })

  it('moveToTrash + listTrash → 可列出', async () => {
    await fileService.writeFile('to-delete.txt', 'delete me')
    await trashService.moveToTrash('to-delete.txt', 'to-delete.txt')
    const items = await trashService.listTrash()
    expect(items.length).toBeGreaterThanOrEqual(1)
  })

  it('restore → 文件恢复', async () => {
    await fileService.writeFile('restore-me.txt', 'restore')
    await trashService.moveToTrash('restore-me.txt', 'restore-me.txt')
    const r = await trashService.restore('restore-me.txt', 'overwrite')
    expect(await fileService.exists(r)).toBe(true)
  })

  it('empty → 清空回收站', async () => {
    await fileService.writeFile('a.txt', 'a')
    await fileService.writeFile('b.txt', 'b')
    await trashService.moveToTrash('a.txt', 'a.txt')
    await trashService.moveToTrash('b.txt', 'b.txt')
    await trashService.empty()
    expect(await trashService.listTrash()).toHaveLength(0)
  })

  it('restore 不存在 → 抛出错误', async () => {
    await expect(trashService.restore('nope', 'overwrite')).rejects.toThrow('Not found')
  })
})

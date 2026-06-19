import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => tmpDir), name: 'do-zhou-test' },
}))

import { projectService } from '../project-service'

beforeEach(async () => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-proj-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('projectService', () => {
  describe('创建项目', () => {
    it('create → 返回 meta', async () => {
      const meta = await projectService.create('test-proj', 'test-skill')
      expect(meta.name).toBe('test-proj')
      expect(meta.skillName).toBe('test-skill')
    })

    it('create → 生成默认文件', async () => {
      await projectService.create('proj2', 'skill2')
      const files = await projectService.listFiles('proj2')
      expect(files.length).toBeGreaterThan(0)
    })

    it('重复创建 → 抛出错误', async () => {
      await projectService.create('dup', 's')
      await expect(projectService.create('dup', 's')).rejects.toThrow('已存在')
    })
  })

  describe('列表和查询', () => {
    it('空列表 → []', async () => {
      expect(await projectService.list()).toHaveLength(0)
    })

    it('按 Skill 过滤', async () => {
      await projectService.create('a', 'skill-a')
      await projectService.create('b', 'skill-b')
      const list = await projectService.list('skill-a')
      expect(list).toHaveLength(1)
      expect(list[0].name).toBe('a')
    })

    it('get 存在的项目 → 返回对象', async () => {
      await projectService.create('got', 's')
      expect(await projectService.get('got')).not.toBeNull()
    })

    it('get 不存在的 → null', async () => {
      expect(await projectService.get('nope')).toBeNull()
    })
  })

  describe('删除', () => {
    it('删除不存在的 → 抛出错误', async () => {
      await expect(projectService.delete('nope')).rejects.toThrow('不存在')
    })
  })

  describe('重命名', () => {
    it('重命名成功的 → 可查到新名', async () => {
      await projectService.create('old', 's')
      await projectService.rename('old', 'new')
      expect(await projectService.get('new')).not.toBeNull()
      expect(await projectService.get('old')).toBeNull()
    })
  })
})

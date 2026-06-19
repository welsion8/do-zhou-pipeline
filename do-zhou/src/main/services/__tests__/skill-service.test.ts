import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SkillService } from '../skill-service'

let tmpDir: string
let service: SkillService

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-skill-${Date.now()}`)
  service = new SkillService(tmpDir)
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('SkillService', () => {
  it('create → 生成目录和元数据', () => {
    const skill = service.create('test-skill', '现代言情', ['大纲', '人物', '章节'])
    expect(skill.name).toBe('test-skill')
    expect(skill.category).toBeTruthy()
    expect(skill.stages.length).toBeGreaterThanOrEqual(3)
    const skillDir = path.join(tmpDir, 'skills', 'test-skill')
    expect(fs.existsSync(skillDir)).toBe(true)
  })

  it('空目录 → 空列表', () => {
    expect(service.getAll()).toHaveLength(0)
  })

  it('多个 Skill → 返回列表', () => {
    service.create('a', '现代言情', ['大纲'])
    service.create('b', '悬疑', ['线索', '推理'])
    expect(service.getAll()).toHaveLength(2)
  })

  it('删除 → 成功', () => {
    const s = service.create('del-me', '现代言情', ['大纲'])
    expect(service.getAll().length).toBeGreaterThan(0)
    expect(service.delete(s.id)).toEqual({ deleted: true, orphanProjects: 0 })
  })

  it('删除不存在的 → 抛出错误', () => {
    expect(() => service.delete('nope')).toThrow()
  })
})

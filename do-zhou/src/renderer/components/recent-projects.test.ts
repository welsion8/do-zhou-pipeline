import { describe, it, expect, beforeEach, vi } from 'vitest'

const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
})

describe('addRecentProject', () => {
  let addRecentProject: any

  beforeEach(async () => {
    Object.keys(store).forEach(k => delete store[k])
    const mod = await import('../components/recent-projects')
    addRecentProject = mod.addRecentProject
  })

  it('添加项目 → 存入 localStorage', () => {
    addRecentProject({ name: 'test-project', skillName: 'test-skill', path: '/test', lastOpenedAt: Date.now() })
    const stored = localStorage.getItem('do-zhou-recent-projects')
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].name).toBe('test-project')
  })

  it('添加多个 → 去重排最前', () => {
    addRecentProject({ name: 'a', skillName: 's', path: '/a', lastOpenedAt: 1 })
    addRecentProject({ name: 'b', skillName: 's', path: '/b', lastOpenedAt: 2 })
    addRecentProject({ name: 'a', skillName: 's', path: '/a', lastOpenedAt: 3 })
    const stored = localStorage.getItem('do-zhou-recent-projects')
    const parsed = JSON.parse(stored!)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].name).toBe('a') // 最新的在最前
  })

  it('最多保留 10 个', () => {
    for (let i = 0; i < 15; i++) {
      addRecentProject({ name: `p${i}`, skillName: 's', path: `/${i}`, lastOpenedAt: i })
    }
    const stored = localStorage.getItem('do-zhou-recent-projects')
    const parsed = JSON.parse(stored!)
    expect(parsed.length).toBeLessThanOrEqual(10)
  })
})

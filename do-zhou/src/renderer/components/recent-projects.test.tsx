// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RecentProjects, addRecentProject } from './recent-projects'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => { store[key] = val },
  removeItem: (key: string) => { delete store[key] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
})

describe('RecentProjects 组件', () => {
  beforeEach(() => {
    Object.keys(store).forEach(k => delete store[k])
  })

  it('空数据 → 不渲染', () => {
    const { container } = render(<RecentProjects onOpenProject={vi.fn()} />)
    expect(container.innerHTML).toBe('')
  })

  it('有数据 → 渲染列表', () => {
    addRecentProject({ name: 'test-project', skillName: 'test-skill', path: '/test', lastOpenedAt: Date.now() })
    render(<RecentProjects onOpenProject={vi.fn()} />)
    expect(screen.getByText('🕐 最近打开')).toBeDefined()
    expect(screen.getByText('test-project')).toBeDefined()
  })

  it('多个项目 → 全部渲染', () => {
    addRecentProject({ name: 'a', skillName: 's', path: '/a', lastOpenedAt: 1 })
    addRecentProject({ name: 'b', skillName: 's', path: '/b', lastOpenedAt: 2 })
    render(<RecentProjects onOpenProject={vi.fn()} />)
    expect(screen.getByText('a')).toBeDefined()
    expect(screen.getByText('b')).toBeDefined()
  })
})

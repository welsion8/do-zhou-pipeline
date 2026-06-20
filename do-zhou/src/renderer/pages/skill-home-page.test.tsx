// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { setupIPCMock } from '../test-utils/ipc-mock'

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
})

// Mock the SkillHomePage component — need dynamic import because it uses electronAPI
let SkillHomePage: any

beforeEach(async () => {
  Object.keys(store).forEach(k => delete store[k])
  setupIPCMock()
  // Reload module to get fresh mock
  const mod = await import('./skill-home-page')
  SkillHomePage = mod.default || mod.SkillHomePage
})

describe('SkillHomePage', () => {
  it('渲染页面', async () => {
    const { container } = render(<SkillHomePage />)
    // 等待异步加载
    await new Promise(r => setTimeout(r, 100))
    expect(container.textContent).toContain('Do 舟')
  })

  it('页面渲染', async () => {
    render(<SkillHomePage />)
    await new Promise(r => setTimeout(r, 100))
    expect(screen.getAllByTestId('btn-import-skill').length).toBeGreaterThan(0)
    expect(screen.getAllByTestId('btn-new-project').length).toBeGreaterThan(0)
  })
})

// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { setupIPCMock } from '../test-utils/ipc-mock'

const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store[k] || null,
  setItem: (k: string, v: string) => { store[k] = v },
  removeItem: (k: string) => { delete store[k] },
  clear: () => { Object.keys(store).forEach(k => delete store[k]) },
})

let SkillEditorPage: any

beforeEach(async () => {
  Object.keys(store).forEach(k => delete store[k])
  setupIPCMock()
  const mod = await import('./skill-editor-page')
  SkillEditorPage = mod.default || mod.SkillEditorPage
})

describe('SkillEditorPage', () => {
  it('渲染页面', async () => {
    render(<SkillEditorPage />)
    await new Promise(r => setTimeout(r, 100))
    expect(screen.getByText(/编辑技能包/)).toBeDefined()
  })

  it('标签导航存在', async () => {
    render(<SkillEditorPage />)
    await new Promise(r => setTimeout(r, 100))
    expect(screen.getAllByText('📋 基本信息').length).toBeGreaterThan(0)
  })
})

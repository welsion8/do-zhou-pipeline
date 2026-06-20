// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { StageCards } from './stage-cards'

const mockAPI = {
  stages: [
    { id: 'outline', name: '故事大纲', bindFile: 'outline.md', state: '✅' as const, status: 'done' as const },
    { id: 'character', name: '人物小传', bindFile: 'character.md', state: '⏹' as const, status: 'pending' as const },
  ],
  activeStage: 'outline',
  expandedStage: null,
  chapters: [],
  handleStageClick: vi.fn(),
  handleChapterJump: vi.fn(),
}

describe('StageCards', () => {
  it('渲染阶段卡片列表', () => {
    const { container } = render(<StageCards api={mockAPI as any} />)
    expect(container.querySelector('[data-testid="stage-card"]')).toBeDefined()
    expect(container.textContent).toContain('📋 创作流程')
  })
})

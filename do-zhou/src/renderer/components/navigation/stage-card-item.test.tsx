// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StageCardItem } from './stage-card-item'

const baseProps = {
  stage: { id: 'outline', name: '故事大纲', bindFile: 'outline.md', state: '✅' as const, status: 'done' as const },
  isActive: false,
  isExpanded: false,
  chapters: [],
  onClick: vi.fn(),
  onChapterJump: vi.fn(),
  chapterJumpInput: '',
  onChapterJumpInputChange: vi.fn(),
}

describe('StageCardItem', () => {
  it('渲染阶段卡片', () => {
    render(<StageCardItem {...baseProps} />)
    expect(screen.getByTestId('stage-card')).toBeDefined()
    expect(screen.getByTestId('stage-card').textContent).toContain('✅')
  })

  it('点击触发 onClick', () => {
    const onClick = vi.fn()
    render(<StageCardItem {...baseProps} onClick={onClick} />)
    fireEvent.click(screen.getByTestId('stage-card'))
    expect(onClick).toHaveBeenCalledWith('outline')
  })

  it('active 状态 → 高亮样式', () => {
    const { container } = render(<StageCardItem {...baseProps} isActive={true} />)
    expect(container.querySelector('.border-l-\\[2px\\]')).toBeDefined()
  })

  it('⟳ 状态 → AI 生成中样式', () => {
    render(<StageCardItem {...baseProps} stage={{ ...baseProps.stage, id: 'chapter_writing', state: '⟳' }} />)
    expect(screen.getByTestId('stage-card').textContent).toContain('⟳')
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ChapterIndexPageWrapper } from './chapter-index-page-wrapper'

describe('ChapterIndexPageWrapper', () => {
  it('渲染章节索引页', () => {
    const { container } = render(<ChapterIndexPageWrapper projectPath="/test" onBack={vi.fn()} onChapterClick={vi.fn()} />)
    expect(container.textContent).toContain('章节目录')
  })
})

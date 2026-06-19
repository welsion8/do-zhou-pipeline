// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChapterIndexView } from './chapter-index-view'

const result = {
  entries: [
    { chapterNo: 1, title: '第一章', fileName: 'Chapter-01.md', status: '✅' as const, exists: true },
    { chapterNo: 2, title: '第二章', fileName: 'Chapter-02.md', status: '⏹' as const, exists: true },
  ],
  consistent: true,
  totalInIndex: 2,
  totalFiles: 2,
}

describe('ChapterIndexView', () => {
  it('渲染章节列表', () => {
    render(<ChapterIndexView result={result} onChapterClick={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('📋 章节目录')).toBeDefined()
  })

  it('空章节列表', () => {
    render(<ChapterIndexView result={{ ...result, entries: [], totalInIndex: 0 }} onChapterClick={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('📋 章节目录')).toBeDefined()
  })
})

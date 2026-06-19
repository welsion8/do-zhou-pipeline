// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChapterIndexRow } from './chapter-index-row'

const baseEntry: any = {
  chapterNo: 1,
  title: '婚礼上的陌生人',
  status: '✅' as const,
  fileName: 'Chapter-01.md',
  exists: true,
}

describe('ChapterIndexRow', () => {
  it('渲染章节行', () => {
    render(<ChapterIndexRow entry={baseEntry} onClick={vi.fn()} />)
    expect(screen.getByTestId('chapter-row')).toBeDefined()
  })

  it('点击触发 onClick', () => {
    const onClick = vi.fn()
    render(<ChapterIndexRow entry={baseEntry} onClick={onClick} />)
    fireEvent.click(screen.getByTestId('chapter-row'))
    expect(onClick).toHaveBeenCalled()
  })
})

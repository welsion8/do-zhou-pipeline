// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeftPanel } from './left-panel'

describe('LeftPanel', () => {
  it('渲染左侧面板', () => {
    const { container } = render(<LeftPanel width={240} activeProject="test" projectPath="/test" onOpenFile={vi.fn()} onChapterIndexClick={vi.fn()} />)
    expect(container.querySelector('.w-\\[240px\\]')).toBeDefined()
  })
})

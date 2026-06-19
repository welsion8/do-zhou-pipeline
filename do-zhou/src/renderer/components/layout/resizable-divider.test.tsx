// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { ResizableDivider } from './resizable-divider'

describe('ResizableDivider', () => {
  it('渲染分隔线', () => {
    const { container } = render(<ResizableDivider onResize={vi.fn()} />)
    expect(container.querySelector('.cursor-col-resize')).toBeDefined()
  })
})

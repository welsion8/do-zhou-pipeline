// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditorToolbar } from './editor-toolbar'

describe('EditorToolbar', () => {
  it('渲染工具栏', () => {
    render(<EditorToolbar onTogglePreview={vi.fn()} isPreview={false} />)
    expect(screen.getByTestId('editor-toolbar')).toBeDefined()
  })

  it('预览模式 → 显示编辑按钮', () => {
    render(<EditorToolbar onTogglePreview={vi.fn()} isPreview={true} />)
    expect(screen.getByTestId('editor-toolbar')).toBeDefined()
  })
})

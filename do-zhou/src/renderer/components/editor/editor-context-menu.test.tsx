// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EditorContextMenu } from './editor-context-menu'

describe('EditorContextMenu', () => {
  it('渲染菜单项', () => {
    render(<EditorContextMenu x={0} y={0} onClose={vi.fn()} onCopy={vi.fn()} onCut={vi.fn()} onPaste={vi.fn()} onAIRewrite={vi.fn()} />)
    expect(screen.getByText('📋 复制')).toBeDefined()
    expect(screen.getByText('✂️ 剪切')).toBeDefined()
    expect(screen.getByText('📄 粘贴')).toBeDefined()
  })

  it('点击复制 → 触发回调', () => {
    const onCopy = vi.fn()
    render(<EditorContextMenu x={0} y={0} onClose={vi.fn()} onCopy={onCopy} onCut={vi.fn()} onPaste={vi.fn()} onAIRewrite={vi.fn()} />)
    fireEvent.click(screen.getByText('📋 复制'))
    expect(onCopy).toHaveBeenCalled()
  })
})

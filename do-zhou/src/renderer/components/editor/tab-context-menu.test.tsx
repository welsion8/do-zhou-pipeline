// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { TabContextMenu } from './tab-context-menu'

describe('TabContextMenu', () => {
  it('渲染菜单项', () => {
    render(<TabContextMenu x={0} y={0} onClose={vi.fn()} onCloseTab={vi.fn()} onCloseOthers={vi.fn()} onCloseAll={vi.fn()} onCopyPath={vi.fn()} />)
    expect(screen.getByText('✕ 关闭')).toBeDefined()
    expect(screen.getByText('关闭其他')).toBeDefined()
    expect(screen.getByText('关闭所有')).toBeDefined()
  })

  it('点击关闭 → 触发回调', () => {
    const onCloseTab = vi.fn()
    render(<TabContextMenu x={0} y={0} onClose={vi.fn()} onCloseTab={onCloseTab} onCloseOthers={vi.fn()} onCloseAll={vi.fn()} onCopyPath={vi.fn()} />)
    fireEvent.click(screen.getByText('✕ 关闭'))
    expect(onCloseTab).toHaveBeenCalled()
  })
})

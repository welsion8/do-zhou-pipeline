// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectContextMenu } from './project-context-menu'

describe('ProjectContextMenu', () => {
  it('渲染菜单项', () => {
    render(<ProjectContextMenu x={0} y={0} onClose={vi.fn()} onOpen={vi.fn()} onRename={vi.fn()} onPin={vi.fn()} onMoveToTrash={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('📂 打开')).toBeDefined()
    expect(screen.getByText('✏️ 重命名')).toBeDefined()
    expect(screen.getByText('📌 置顶')).toBeDefined()
  })

  it('点击打开 → 触发回调', () => {
    const onOpen = vi.fn()
    render(<ProjectContextMenu x={0} y={0} onClose={vi.fn()} onOpen={onOpen} onRename={vi.fn()} onPin={vi.fn()} onMoveToTrash={vi.fn()} onDelete={vi.fn()} />)
    fireEvent.click(screen.getByText('📂 打开'))
    expect(onOpen).toHaveBeenCalled()
  })
})

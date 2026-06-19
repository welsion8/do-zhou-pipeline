// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FileTreeContextMenu } from './file-tree-context-menu'

describe('FileTreeContextMenu', () => {
  it('渲染菜单项', () => {
    render(<FileTreeContextMenu x={0} y={0} onClose={vi.fn()} onOpen={vi.fn()} onRename={vi.fn()} onDelete={vi.fn()} />)
    expect(screen.getByText('📂 打开')).toBeDefined()
    expect(screen.getByText('✏️ 重命名')).toBeDefined()
    expect(screen.getByText('🗑 删除')).toBeDefined()
  })
})

// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatOperationButtons } from './chat-operation-buttons'

describe('ChatOperationButtons', () => {
  it('渲染操作按钮', () => {
    render(<ChatOperationButtons fileName="outline.md" />)
    expect(screen.getByText('📝 已写入 outline.md')).toBeDefined()
    expect(screen.getByText('✏️ 手动调整')).toBeDefined()
    expect(screen.getByText('🔄 重新生成')).toBeDefined()
  })
})

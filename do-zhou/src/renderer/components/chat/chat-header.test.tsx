// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatHeader } from './chat-header'

describe('ChatHeader', () => {
  it('渲染标题和 token 数', () => {
    render(<ChatHeader tokenCount={12400} />)
    expect(screen.getByText('AI 对话')).toBeDefined()
    expect(screen.getByText('📊 12.4K')).toBeDefined()
  })

  it('无 token 数 → 不显示', () => {
    render(<ChatHeader />)
    expect(screen.getByText('AI 对话')).toBeDefined()
  })

  it('按钮可点击', () => {
    const onSearch = vi.fn()
    render(<ChatHeader onSearch={onSearch} />)
    expect(screen.getByTestId('btn-search')).toBeDefined()
  })
})

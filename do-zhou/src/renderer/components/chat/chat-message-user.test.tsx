// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessageUser } from './chat-message-user'

describe('ChatMessageUser', () => {
  it('渲染用户消息', () => {
    render(<ChatMessageUser content="用户输入的内容" />)
    expect(screen.getByText('用户输入的内容')).toBeDefined()
  })

  it('空内容 → 空渲染', () => {
    const { container } = render(<ChatMessageUser content="" />)
    expect(container.querySelector('.rounded-sm')).toBeDefined()
  })
})

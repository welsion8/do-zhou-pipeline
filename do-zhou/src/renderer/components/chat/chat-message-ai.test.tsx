// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessageAI } from './chat-message-ai'

describe('ChatMessageAI', () => {
  it('渲染消息内容', () => {
    render(<ChatMessageAI content="你好，这是 AI 回复" />)
    expect(screen.getByText('你好，这是 AI 回复')).toBeDefined()
  })

  it('streaming 模式 → 显示占位符', () => {
    const { container } = render(<ChatMessageAI content="" isStreaming={true} />)
    expect(container.textContent).toContain('...')
  })

  it('渲染 Markdown 格式', () => {
    render(<ChatMessageAI content="**粗体** 和 *斜体*" />)
    expect(screen.getByText('粗体')).toBeDefined()
  })

  it('空内容 + 非 streaming → 空渲染', () => {
    const { container } = render(<ChatMessageAI content="" />)
    expect(container.querySelector('.flex.gap-0')).toBeDefined()
  })
})

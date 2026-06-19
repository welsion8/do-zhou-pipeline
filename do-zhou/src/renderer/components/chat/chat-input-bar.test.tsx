// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChatInputBar } from './chat-input-bar'

describe('ChatInputBar', () => {
  it('渲染输入框和发送按钮', () => {
    render(<ChatInputBar onSend={vi.fn()} />)
    expect(screen.getByTestId('chat-input')).toBeDefined()
    expect(screen.getByTestId('btn-send')).toBeDefined()
  })

  it('输入文字后发送按钮可用', () => {
    render(<ChatInputBar onSend={vi.fn()} />)
    const input = screen.getByTestId('chat-input')
    fireEvent.change(input, { target: { value: 'hello' } })
    expect((screen.getByTestId('btn-send') as HTMLButtonElement).disabled).toBe(false)
  })

  it('disabled 状态 → 输入框禁用', () => {
    render(<ChatInputBar onSend={vi.fn()} disabled={true} />)
    expect((screen.getByTestId('chat-input') as HTMLTextAreaElement).disabled).toBe(true)
  })

  it('点击发送 → 调用 onSend', () => {
    const onSend = vi.fn()
    render(<ChatInputBar onSend={onSend} />)
    fireEvent.change(screen.getByTestId('chat-input'), { target: { value: 'test' } })
    fireEvent.click(screen.getByTestId('btn-send'))
    expect(onSend).toHaveBeenCalledWith('test')
  })
})

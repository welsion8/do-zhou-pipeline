// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatSystemMessage } from './chat-system-message'

describe('ChatSystemMessage', () => {
  it('渲染系统消息', () => {
    render(<ChatSystemMessage content="── 阶段分隔线 ──" />)
    expect(screen.getByText('── 阶段分隔线 ──')).toBeDefined()
  })
})

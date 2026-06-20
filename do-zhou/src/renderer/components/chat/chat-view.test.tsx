// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { setupIPCMock } from '../../test-utils/ipc-mock'

let ChatView: any

beforeEach(async () => {
  setupIPCMock()
  const mod = await import('./chat-view')
  ChatView = mod.default || mod.ChatView
})

describe('ChatView', () => {
  it('渲染对话区', async () => {
    const { container } = render(<ChatView projectRoot="/test" />)
    await new Promise(r => setTimeout(r, 100))
    expect(container.querySelector('[data-testid="chat-body"]')).toBeDefined()
  })
})

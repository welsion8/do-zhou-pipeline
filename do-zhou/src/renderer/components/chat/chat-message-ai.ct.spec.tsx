import { test, expect } from '@playwright/experimental-ct-react'
import { ChatMessageAI } from './chat-message-ai'

test.describe('ChatMessageAI (Playwright CT)', () => {
  test('渲染 AI 消息', async ({ mount }) => {
    const c = await mount(<ChatMessageAI content="你好，这是 AI 回复" />)
    await expect(c).toContainText('你好，这是 AI 回复')
  })

  test('streaming → 显示占位 ...', async ({ mount }) => {
    const c = await mount(<ChatMessageAI content="" isStreaming={true} />)
    await expect(c).toContainText('...')
  })

  test('空内容 → 存在容器', async ({ mount }) => {
    const c = await mount(<ChatMessageAI content="" />)
    const html = await c.innerHTML()
    expect(html).toBeDefined()
  })
})

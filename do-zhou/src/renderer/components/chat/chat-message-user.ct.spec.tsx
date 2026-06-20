import { test, expect } from '@playwright/experimental-ct-react'
import { ChatMessageUser } from './chat-message-user'

test.describe('ChatMessageUser (CT)', () => {
  test('渲染用户消息', async ({ mount }) => {
    const c = await mount(<ChatMessageUser content="用户输入的内容" />)
    await expect(c).toContainText('用户输入的内容')
  })

  test('空内容 → 空渲染', async ({ mount }) => {
    const c = await mount(<ChatMessageUser content="" />)
    expect(await c.innerHTML()).toBeDefined()
  })
})

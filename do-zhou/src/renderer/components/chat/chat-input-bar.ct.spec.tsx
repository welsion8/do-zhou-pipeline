import { test, expect } from '@playwright/experimental-ct-react'
import { ChatInputBar } from './chat-input-bar'

test.describe('ChatInputBar (CT)', () => {
  test('渲染输入框和发送按钮', async ({ mount }) => {
    const c = await mount(<ChatInputBar onSend={() => {}} />)
    await expect(c.locator('[data-testid="chat-input"]')).toBeVisible()
    await expect(c.locator('[data-testid="btn-send"]')).toBeVisible()
  })

  test('输入文字后发送按钮可用', async ({ mount }) => {
    const c = await mount(<ChatInputBar onSend={() => {}} />)
    await c.locator('[data-testid="chat-input"]').fill('hello')
    await expect(c.locator('[data-testid="btn-send"]')).not.toBeDisabled()
  })

  test('disabled → 输入框禁用', async ({ mount }) => {
    const c = await mount(<ChatInputBar onSend={() => {}} disabled={true} />)
    await expect(c.locator('[data-testid="chat-input"]')).toBeDisabled()
  })
})

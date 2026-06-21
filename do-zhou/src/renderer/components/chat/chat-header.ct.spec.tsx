import { test, expect } from '../../../../playwright/ct-coverage-fixture'
import { ChatHeader } from './chat-header'

test.describe('ChatHeader (CT)', () => {
  test('渲染', async ({ mount }) => {
    const c = await mount(<ChatHeader tokenCount={12400} />)
    await expect(c).toContainText('AI 对话')
    await expect(c).toContainText('12.4K')
  })
})

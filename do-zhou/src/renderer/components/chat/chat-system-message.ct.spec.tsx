import { test, expect } from '../../../../playwright/ct-coverage-fixture'
import { ChatSystemMessage } from './chat-system-message'

test.describe('ChatSystemMessage (CT)', () => {
  test('渲染系统消息', async ({ mount }) => {
    const c = await mount(<ChatSystemMessage content="── 阶段分隔线 ──" />)
    await expect(c).toContainText('阶段分隔线')
  })
})

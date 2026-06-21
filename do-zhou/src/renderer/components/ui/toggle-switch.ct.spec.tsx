import { test, expect } from '../../../../playwright/ct-coverage-fixture'
import { ToggleSwitch } from './toggle-switch'

test.describe('ToggleSwitch (CT)', () => {
  test('渲染并点击切换', async ({ mount }) => {
    let val = false
    const c = await mount(<ToggleSwitch checked={false} onChange={(v) => { val = v }} label="自动保存" />)
    await expect(c).toContainText('自动保存')
    await c.locator('button').click()
    expect(val).toBe(true)
  })
})

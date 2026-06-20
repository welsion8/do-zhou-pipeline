import { test, expect } from '@playwright/experimental-ct-react'
import { Toolbar } from './toolbar'

test.describe('Toolbar (CT)', () => {
  test('渲染按钮', async ({ mount }) => {
    const c = await mount(<Toolbar skillName="现代言情" projectName="霸总" />)
    await expect(c.locator('[data-testid="btn-home"]')).toBeVisible()
    await expect(c.locator('[data-testid="btn-model-switch"]')).toBeVisible()
    await expect(c.locator('[data-testid="btn-settings"]')).toBeVisible()
  })

  test('显示项目名', async ({ mount }) => {
    const c = await mount(<Toolbar skillName="🎬 现代言情" projectName="霸总契约新娘" />)
    await expect(c).toContainText('霸总契约新娘')
  })

  test('点击主页按钮', async ({ mount }) => {
    let clicked = false
    const c = await mount(<Toolbar onHomeClick={() => { clicked = true }} />)
    await c.locator('[data-testid="btn-home"]').click()
    expect(clicked).toBe(true)
  })
})

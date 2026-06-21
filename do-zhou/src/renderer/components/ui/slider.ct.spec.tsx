import { test, expect } from '../../../../playwright/ct-coverage-fixture'
import { Slider } from './slider'

test.describe('Slider (CT)', () => {
  test('渲染', async ({ mount }) => {
    const c = await mount(<Slider min={12} max={24} value={16} onChange={() => {}} label="字号" />)
    await expect(c).toContainText('字号')
  })
})

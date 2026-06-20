import { test, expect } from '@playwright/experimental-ct-react'
import { DropdownSelect } from './dropdown-select'

const opts = [{ label: 'Inter', value: 'inter' }, { label: 'Noto', value: 'noto' }]

test.describe('DropdownSelect (CT)', () => {
  test('渲染当前值', async ({ mount }) => {
    const c = await mount(<DropdownSelect options={opts} value="inter" onChange={() => {}} />)
    await expect(c).toContainText('Inter')
  })
})

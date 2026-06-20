import { test, expect } from '@playwright/experimental-ct-react'
import { StatusBar } from './status-bar'

test.describe('StatusBar (CT)', () => {
  test('渲染', async ({ mount }) => {
    const c = await mount(<StatusBar cursorLine={12} cursorCol={48} autoSaved={true} />)
    await expect(c).toContainText('行 12')
  })
})

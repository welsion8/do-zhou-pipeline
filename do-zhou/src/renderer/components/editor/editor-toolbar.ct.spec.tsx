import { test, expect } from '@playwright/experimental-ct-react'
import { EditorToolbar } from './editor-toolbar'

test.describe('EditorToolbar (CT)', () => {
  test('渲染', async ({ mount }) => {
    const c = await mount(<EditorToolbar onTogglePreview={() => {}} isPreview={false} />)
    await expect(c).toBeVisible()
  })
})

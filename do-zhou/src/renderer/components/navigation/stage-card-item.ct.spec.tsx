import { test, expect } from '@playwright/experimental-ct-react'
import { StageCardItem } from './stage-card-item'

const base = {
  stage: { id: 'outline', name: '故事大纲', bindFile: 'outline.md', state: '✅' as const, status: 'done' as const },
  isActive: false, isExpanded: false, chapters: [],
  onClick: () => {}, onChapterJump: () => {},
  chapterJumpInput: '', onChapterJumpInputChange: () => {},
}

test.describe('StageCardItem (CT)', () => {
  test('渲染并点击', async ({ mount }) => {
    let clickedId = ''
    const c = await mount(<StageCardItem {...base} onClick={(id: string) => { clickedId = id }} />)
    await expect(c.locator('[data-testid="stage-card"]')).toBeVisible()
    await c.locator('[data-testid="stage-card"]').click()
    expect(clickedId).toBe('outline')
  })

  test('⟳ 状态', async ({ mount }) => {
    await mount(<StageCardItem {...base} stage={{ ...base.stage, state: '⟳' }} />)
    // 渲染不报错即通过
  })
})

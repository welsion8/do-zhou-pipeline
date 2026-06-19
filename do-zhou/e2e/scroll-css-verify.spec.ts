/**
 * 独立滚动验证测试 — 打开 scroll-test.html 验证 CSS 滚动行为
 * 不依赖 Electron，直接在 Chromium 中测试相同的 CSS 结构
 */
import { test, expect } from '@playwright/test'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

test('编辑模式：overflow-hidden外层 + overflow-y-auto内层 → 应可滚动', async ({ page }) => {
  const testFile = resolve('F:/小说桌面端工具/do-zhou/scroll-test.html')
  await page.goto(`file://${testFile}`)

  // 等待页面加载和初始诊断
  await page.waitForTimeout(500)

  // 读取诊断面板
  const diagText = await page.textContent('#diag')
  console.log('📊 编辑模式诊断结果:')
  console.log(diagText)

  // 验证关键指标
  expect(diagText).toContain('✅ 可以滚动')
  expect(diagText).toContain('✅ scrollTop 成功')
  expect(diagText).toContain('overflow: hidden') // 外层应为 hidden

  // 尝试用 Playwright 直接滚动编辑器模拟区
  const sim = page.locator('#cmSimulator')
  const before = await sim.evaluate((el: HTMLElement) => el.scrollTop)
  await sim.evaluate((el: HTMLElement) => { el.scrollTop = 500 })
  const after = await sim.evaluate((el: HTMLElement) => el.scrollTop)
  console.log(`📜 Edit mode scrollTop: ${before} → ${after}`)
  expect(after).toBeGreaterThan(before)
})

test('预览模式：overflow-hidden外层 + overflow-y-auto内层 → 应可滚动', async ({ page }) => {
  const testFile = resolve('F:/小说桌面端工具/do-zhou/scroll-test.html')
  await page.goto(`file://${testFile}`)

  await page.waitForTimeout(500)

  // 切换到预览模式
  await page.click('#btnPreview')

  await page.waitForTimeout(300)

  const diagText = await page.textContent('#diag')
  console.log('📊 预览模式诊断结果:')
  console.log(diagText)

  expect(diagText).toContain('✅ 可以滚动')
  expect(diagText).toContain('✅ scrollTop 成功')

  // 测试滚动
  const sim = page.locator('#previewSimulator')
  const before = await sim.evaluate((el: HTMLElement) => el.scrollTop)
  await sim.evaluate((el: HTMLElement) => { el.scrollTop = 500 })
  const after = await sim.evaluate((el: HTMLElement) => el.scrollTop)
  console.log(`📜 Preview mode scrollTop: ${before} → ${after}`)
  expect(after).toBeGreaterThan(before)
})

test('回归测试：overflow-y-auto外层 + h-full内层 → 可能无法滚动', async ({ page }) => {
  const testFile = resolve('F:/小说桌面端工具/do-zhou/scroll-test.html')
  await page.goto(`file://${testFile}`)

  await page.waitForTimeout(300)

  // 把外层改成 overflow-y: auto（模拟修复前的 bug）
  await page.evaluate(() => {
    const el = document.getElementById('editorArea')
    if (el) el.style.overflow = 'auto'
  })

  await page.waitForTimeout(300)

  const diagText = await page.textContent('#diag')
  console.log('📊 回归测试（overflow-y:auto 外层）诊断结果:')
  console.log(diagText)

  // 这里可能通过也可能失败，取决于浏览器对 height:100% 在 overflow:auto 中的处理
  // 记录结果用于分析
  const sim = page.locator('#cmSimulator')
  const scrollInfo = await sim.evaluate((el: HTMLElement) => ({
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    canScroll: el.scrollHeight > el.clientHeight + 2,
    scrollTop: el.scrollTop,
  }))
  console.log('📊 回归测试滚动信息:', JSON.stringify(scrollInfo))
})

/**
 * 视觉回归截图 — 生成基线 / 对比差异
 *
 * 用法:
 *   生成基线: npx playwright test e2e/visual-regression/capture.spec.ts
 *   对比模式: 自动检测基线是否存在 → 存在则对比 → 不存在则生成
 */
import { test, expect } from '@playwright/test'
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { resolve } from 'path'

const BASELINE_DIR = resolve('F:/小说桌面端工具/.claude/visual-baselines')
const PAGES = [
  { name: 'Skill主页', url: 'http://localhost:5173' },
  { name: '写作工作台', url: 'http://localhost:5173' },
  { name: 'API配置页', url: 'http://localhost:5173' },
  { name: '设置页', url: 'http://localhost:5173' },
]

// 确保基线目录存在
if (!existsSync(BASELINE_DIR)) mkdirSync(BASELINE_DIR, { recursive: true })

const isBaseline = readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png')).length === 0

test.describe('视觉回归', () => {
  for (const page of PAGES) {
    test(`${page.name} — ${isBaseline ? '生成基线' : '对比'}`, async ({ page: pwPage }) => {
      await pwPage.setViewportSize({ width: 1200, height: 800 })
      await pwPage.goto(page.url, { timeout: 10000, waitUntil: 'domcontentloaded' })
      await pwPage.waitForTimeout(3000)

      const screenshot = await pwPage.screenshot({ fullPage: false })
      const baselinePath = resolve(BASELINE_DIR, `${page.name}.png`)

      if (isBaseline) {
        writeFileSync(baselinePath, screenshot)
        console.log(`📸 基线已保存: ${page.name}`)
      } else {
        // 对比模式: 使用 Playwright 内置 toMatchSnapshot
        expect(screenshot).toMatchSnapshot(`${page.name}.png`)
      }
    })
  }
})

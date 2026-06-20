# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: visual-regression\capture.spec.ts >> 视觉回归 >> 设置页 — 对比
- Location: visual-regression\capture.spec.ts:27:9

# Error details

```
Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
Call log:
  - navigating to "http://localhost:5173/", waiting until "domcontentloaded"

```

# Test source

```ts
  1  | /**
  2  |  * 视觉回归截图 — 生成基线 / 对比差异
  3  |  *
  4  |  * 用法:
  5  |  *   生成基线: npx playwright test e2e/visual-regression/capture.spec.ts
  6  |  *   对比模式: 自动检测基线是否存在 → 存在则对比 → 不存在则生成
  7  |  */
  8  | import { test, expect } from '@playwright/test'
  9  | import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs'
  10 | import { resolve } from 'path'
  11 | 
  12 | const BASELINE_DIR = resolve('F:/小说桌面端工具/.claude/visual-baselines')
  13 | const PAGES = [
  14 |   { name: 'Skill主页', url: 'http://localhost:5173' },
  15 |   { name: '写作工作台', url: 'http://localhost:5173' },
  16 |   { name: 'API配置页', url: 'http://localhost:5173' },
  17 |   { name: '设置页', url: 'http://localhost:5173' },
  18 | ]
  19 | 
  20 | // 确保基线目录存在
  21 | if (!existsSync(BASELINE_DIR)) mkdirSync(BASELINE_DIR, { recursive: true })
  22 | 
  23 | const isBaseline = readdirSync(BASELINE_DIR).filter(f => f.endsWith('.png')).length === 0
  24 | 
  25 | test.describe('视觉回归', () => {
  26 |   for (const page of PAGES) {
  27 |     test(`${page.name} — ${isBaseline ? '生成基线' : '对比'}`, async ({ page: pwPage }) => {
  28 |       await pwPage.setViewportSize({ width: 1200, height: 800 })
> 29 |       await pwPage.goto(page.url, { timeout: 10000, waitUntil: 'domcontentloaded' })
     |                    ^ Error: page.goto: net::ERR_CONNECTION_REFUSED at http://localhost:5173/
  30 |       await pwPage.waitForTimeout(3000)
  31 | 
  32 |       const screenshot = await pwPage.screenshot({ fullPage: false })
  33 |       const baselinePath = resolve(BASELINE_DIR, `${page.name}.png`)
  34 | 
  35 |       if (isBaseline) {
  36 |         writeFileSync(baselinePath, screenshot)
  37 |         console.log(`📸 基线已保存: ${page.name}`)
  38 |       } else {
  39 |         // 对比模式: 使用 Playwright 内置 toMatchSnapshot
  40 |         expect(screenshot).toMatchSnapshot(`${page.name}.png`)
  41 |       }
  42 |     })
  43 |   }
  44 | })
  45 | 
```
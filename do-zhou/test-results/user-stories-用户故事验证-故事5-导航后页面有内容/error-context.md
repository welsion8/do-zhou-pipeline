# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-stories.spec.ts >> 用户故事验证 >> 故事5: 导航后页面有内容
- Location: user-stories.spec.ts:90:7

# Error details

```
Error: expect(received).toBeGreaterThan(expected)

Expected: > 30
Received:   27
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "📋 章节目录" [level=2] [ref=e5]
    - button "← 返回工作台" [ref=e6]
  - generic [ref=e7]:
    - generic [ref=e8]: ⚠
    - paragraph [ref=e9]: 读取章节目录失败
```

# Test source

```ts
  1   | /**
  2   |  * 用户故事 E2E — 按 Spec→E2E 深度标准自动生成
  3   |  * 每条测试 = 操作 → 等待结果 → 验证最终状态
  4   |  */
  5   | import { test, expect, _electron as electron } from '@playwright/test'
  6   | import path from 'path'
  7   | 
  8   | const EP = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
  9   | const MAIN = path.join(__dirname, '..', 'out', 'main', 'index.js')
  10  | 
  11  | async function waitForBody(page, minLen, timeout) {
  12  |   if (!minLen) minLen = 30; if (!timeout) timeout = 20000
  13  |   var start = Date.now()
  14  |   while (Date.now() - start < timeout) {
  15  |     var txt = await page.locator('body').innerText().catch(function() { return '' })
  16  |     if (txt.length >= minLen) return txt
  17  |     await page.waitForTimeout(2000)
  18  |   }
  19  |   return await page.locator('body').innerText().catch(function() { return '' })
  20  | }
  21  | 
  22  | test.describe('用户故事验证', function() {
  23  |   var app, page
  24  | 
  25  |   test.beforeAll(async function() {
  26  |     app = await electron.launch({ executablePath: EP, args: [MAIN] })
  27  |     page = await app.firstWindow()
  28  |     await page.waitForLoadState('load').catch(function() {})
  29  |     var txt = await waitForBody(page, 50, 25000)
  30  |     expect(txt.length).toBeGreaterThan(0)
  31  |   }, 35000)
  32  | 
  33  |   test.afterAll(async function() {
  34  |     try { await app.close(); await app.process().kill() } catch (e) {}
  35  |   })
  36  | 
  37  |   // ═══ 故事1: 导入Skill → 列表出现 → 显示正确元数据 ═══
  38  |   test('故事1: 工作台→Skill主页可导航', async function() {
  39  |     var homeBtn = page.locator('button[aria-label="主页"]')
  40  |     if (await homeBtn.isVisible().catch(function() { return false })) {
  41  |       await homeBtn.click()
  42  |     }
  43  |     var txt = await waitForBody(page, 50, 15000)
  44  |     // Skill主页应有"导入"或"技能包"
  45  |     var hasSkillPage = txt.indexOf('导入') !== -1 || txt.indexOf('技能包') !== -1 || txt.indexOf('Skill') !== -1
  46  |     expect(hasSkillPage).toBe(true)
  47  |   })
  48  | 
  49  |   // ═══ 故事2: Skill主页→新建项目→工作台文件树有文件 ═══
  50  |   test('故事2: Skill主页含回收站和新建按钮', async function() {
  51  |     var txt = await page.locator('body').innerText().catch(function() { return '' })
  52  |     expect(txt.indexOf('回收站') !== -1).toBe(true)
  53  |     expect(txt.indexOf('新建') !== -1).toBe(true)
  54  |   })
  55  | 
  56  |   // ═══ 故事3: 返回工作台→阶段卡片存在 ═══
  57  |   test('故事3: 返回工作台→阶段卡片可见', async function() {
  58  |     // 导航回工作台 (点Home或章节目录快捷键)
  59  |     await page.keyboard.press('Control+Shift+C')
  60  |     await page.waitForTimeout(1500)
  61  |     var txt = await page.locator('body').innerText().catch(function() { return '' })
  62  |     // 工作台应有"故事大纲"或"创作流程"
  63  |     var hasWorkspace = txt.indexOf('故事大纲') !== -1 || txt.indexOf('创作流程') !== -1 || txt.indexOf('章节') !== -1
  64  |     expect(hasWorkspace).toBe(true)
  65  |   })
  66  | 
  67  |   // ═══ 故事4: 无崩溃验证 ═══
  68  |   test('故事4: 所有导航无崩溃', async function() {
  69  |     var errors = []
  70  |     page.on('console', function(msg) { if (msg.type() === 'error') errors.push(msg.text()) })
  71  |     // 点Home
  72  |     var homeBtn = page.locator('button[aria-label="主页"]')
  73  |     if (await homeBtn.isVisible().catch(function() { return false })) { await homeBtn.click(); await page.waitForTimeout(1000) }
  74  |     // 再点几个按钮
  75  |     var btns = page.locator('button')
  76  |     var count = await btns.count()
  77  |     for (var i = 0; i < Math.min(count - 5, 4); i++) {
  78  |       await btns.nth(i).click().catch(function() {})
  79  |       try { await page.waitForTimeout(200) } catch (e) { break }
  80  |     }
  81  |     // 只检查ReferenceError/TypeError
  82  |     var fatal = errors.filter(function(e) {
  83  |       return (e.indexOf('ReferenceError') !== -1 || e.indexOf('TypeError') !== -1 || e.indexOf('is not defined') !== -1) &&
  84  |              e.indexOf('Security Warning') === -1 &&
  85  |              e.indexOf('React DevTools') === -1
  86  |     })
  87  |     expect(fatal.length).toBe(0)
  88  |   })
  89  | 
  90  |   test('故事5: 导航后页面有内容', async function() {
  91  |     // 清理可能的残留状态：关闭弹窗、按 Escape、等待渲染
  92  |     await page.keyboard.press('Escape').catch(function() {})
  93  |     await page.waitForTimeout(1000)
  94  |     // 多重回退：主页按钮 → data-testid → 直接检查
  95  |     var homeBtn = page.locator('button[aria-label="主页"], [data-testid="btn-home"]')
  96  |     if (await homeBtn.isVisible({ timeout: 5000 }).catch(function() { return false })) {
  97  |       await homeBtn.click(); await page.waitForTimeout(3000)
  98  |     }
  99  |     var body = await page.locator('body').innerText().catch(function() { return '' })
> 100 |     expect(body.length).toBeGreaterThan(30)
      |                         ^ Error: expect(received).toBeGreaterThan(expected)
  101 |   })
  102 | })
  103 | 
```
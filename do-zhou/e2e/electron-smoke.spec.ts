/**
 * Do舟 E2E 冒烟测试 — 优化版（稳定选择器 + 轮询等待）
 */
import { test, expect, _electron as electron } from '@playwright/test'
import path from 'path'

const EP = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe')
const MAIN = path.join(__dirname, '..', 'out', 'main', 'index.js')

// 稳定等待：轮询 body 文本直到有足够内容
async function waitForAppReady(page, minLen, timeoutMs) {
  if (!minLen) minLen = 50
  if (!timeoutMs) timeoutMs = 20000
  var start = Date.now()
  while (Date.now() - start < timeoutMs) {
    var txt = await page.locator('body').innerText().catch(function() { return '' })
    if (txt.length >= minLen) return true
    await page.waitForTimeout(2000)
  }
  return false
}

// 点击按钮——按文本内容匹配（比 aria-label 更稳定）
async function clickByText(page, text) {
  var btn = page.locator('button').filter({ hasText: text }).first()
  if (await btn.isVisible().catch(function() { return false })) { await btn.click(); return true }
  // 回退：尝试找包含该文本的任何可点击元素
  var any = page.locator('[role="button"], button, a').filter({ hasText: text }).first()
  if (await any.isVisible().catch(function() { return false })) { await any.click(); return true }
  return false
}

test.describe('Do舟 冒烟测试', function() {
  var app, page

  test.beforeAll(async function() {
    app = await electron.launch({ executablePath: EP, args: [MAIN] })
    page = await app.firstWindow()
    await page.waitForLoadState('load').catch(function() {})
    var ready = await waitForAppReady(page, 50, 25000)
    expect(ready).toBe(true)
  }, 35000)

  test.afterAll(async function() {
    try { await app.close(); await app.process().kill() } catch (e) {}
  })

  test('01 - UI已渲染', async function() {
    var btns = await page.locator('button').count()
    expect(btns).toBeGreaterThan(0)
  })

  test('02 - 左侧面板存在', async function() {
    var aside = page.locator('aside').first()
    var ok = await aside.isVisible().catch(function() { return false })
    // 回退：检查是否有任何面板样式的元素
    if (!ok) ok = await page.locator('[class*="bg-panel"]').first().isVisible().catch(function() { return false })
    expect(ok).toBe(true)
  })

  test('03 - 控制台无崩溃', async function() {
    var errors = []
    page.on('console', function(msg) { if (msg.type() === 'error') errors.push(msg.text()) })
    var firstBtn = page.locator('button').first()
    if (await firstBtn.isVisible().catch(function() { return false })) { await firstBtn.click().catch(function() {}); await page.waitForTimeout(300) }
    var fatal = errors.filter(function(e) { return e.indexOf('Security Warning') === -1 && e.indexOf('React DevTools') === -1 })
    var crashes = fatal.filter(function(e) { return e.indexOf('ReferenceError') !== -1 || e.indexOf('TypeError') !== -1 || e.indexOf('is not defined') !== -1 })
    expect(crashes.length).toBe(0)
  })

  test('04 - 多点按钮无崩溃', async function() {
    var errors = []
    page.on('console', function(msg) { if (msg.type() === 'error') errors.push(msg.text()) })
    var btns = page.locator('button')
    var count = await btns.count()
    var safeCount = Math.max(0, count - 5)  // 跳过最后5个按钮（窗口控制+设置等）
    for (var i = 0; i < Math.min(safeCount, 5); i++) { await btns.nth(i).click().catch(function() {}); try { await page.waitForTimeout(100) } catch (e) { break } }
    var crashes = errors.filter(function(e) { return e.indexOf('ReferenceError') !== -1 || e.indexOf('TypeError') !== -1 || e.indexOf('is not defined') !== -1 })
    expect(crashes.length).toBe(0)
  })
})

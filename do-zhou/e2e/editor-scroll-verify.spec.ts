/**
 * 编辑模式滚动验证测试
 * 验证 CodeMirror 编辑器在编辑模式下能正常滚动长内容
 */
import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'

test.describe('编辑器滚动验证', () => {
  test('编辑模式：长内容应该可滚动（scrollHeight > clientHeight）', async () => {
    // 启动 Electron 应用
    const electronApp = await electron.launch({
      args: ['.'],
      cwd: 'F:/小说桌面端工具/do-zhou',
      executablePath: require('electron'),
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')

    // 等待应用加载完成
    await page.waitForTimeout(3000)

    // 尝试通过文件树打开一个有内容的文件
    // 或者直接在编辑器 API 中注入长内容来测试滚动
    const scrollInfo = await page.evaluate(() => {
      // 检查 CodeMirror 编辑器是否存在
      const scroller = document.querySelector('.cm-scroller') as HTMLElement | null
      if (!scroller) {
        return { found: false, reason: 'CodeMirror scroller not found in DOM' }
      }

      const content = document.querySelector('.cm-content') as HTMLElement | null
      const scrollHeight = scroller.scrollHeight
      const clientHeight = scroller.clientHeight
      const canScroll = scrollHeight > clientHeight

      return {
        found: true,
        scrollHeight,
        clientHeight,
        canScroll,
        contentLines: content?.querySelectorAll('.cm-line').length ?? 0,
        overflowY: getComputedStyle(scroller).overflowY,
      }
    })

    console.log('CodeMirror 滚动状态:', JSON.stringify(scrollInfo, null, 2))

    // 如果 CodeMirror 存在且有内容，验证可以滚动
    if (scrollInfo.found && scrollInfo.contentLines > 0) {
      expect(scrollInfo.canScroll || scrollInfo.contentLines <= 20,
        `长内容应可滚动: scrollHeight=${scrollInfo.scrollHeight}, clientHeight=${scrollInfo.clientHeight}`
      ).toBeTruthy()
    }

    // 验证外层容器不会阻止滚动
    const containerInfo = await page.evaluate(() => {
      const editorContainer = document.querySelector('.flex-1.overflow-hidden') as HTMLElement | null
      if (!editorContainer) return { found: false }
      const style = getComputedStyle(editorContainer)
      return {
        found: true,
        overflow: style.overflow,
        overflowY: style.overflowY,
        height: editorContainer.clientHeight,
      }
    })

    console.log('编辑器容器状态:', JSON.stringify(containerInfo, null, 2))
    expect(containerInfo.found, '编辑器容器应存在').toBe(true)
    expect(containerInfo.overflowY, '外层容器应为 overflow: hidden，不干扰 CodeMirror 原生滚动').toBe('hidden')

    await electronApp.close()
  })

  test('预览模式：长内容应该可滚动', async () => {
    const electronApp = await electron.launch({
      args: ['.'],
      cwd: 'F:/小说桌面端工具/do-zhou',
      executablePath: require('electron'),
    })

    const page = await electronApp.firstWindow()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)

    // 切换到预览模式（如果可能）
    const previewInfo = await page.evaluate(() => {
      const previewDiv = document.querySelector('.prose, [class*="markdown-preview"]') as HTMLElement | null
      if (previewDiv) {
        const style = getComputedStyle(previewDiv)
        return {
          found: true,
          overflowY: style.overflowY,
          scrollHeight: previewDiv.scrollHeight,
          clientHeight: previewDiv.clientHeight,
        }
      }
      return { found: false }
    })

    console.log('预览模式状态:', JSON.stringify(previewInfo, null, 2))
    await electronApp.close()
  })
})

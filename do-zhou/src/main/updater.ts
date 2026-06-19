/**
 * 自动更新 — electron-updater
 *
 * 检查 GitHub Releases 更新，下载并提示安装。
 * 开发环境跳过检查。
 */

import { app } from 'electron'

let autoUpdater: { checkForUpdatesAndNotify?: () => void } | null = null

export function initAutoUpdater(): void {
  // 开发环境跳过
  if (!app.isPackaged) return

  try {
    // 动态导入（electron-updater 可能未安装，不阻塞启动）
    const { autoUpdater: au } = require('electron-updater')
    autoUpdater = au

    au.checkForUpdatesAndNotify?.()
    console.log('[Do舟] 自动更新检查已启动')
  } catch {
    console.log('[Do舟] electron-updater 未安装，跳过自动更新')
  }
}

export function checkForUpdates(): void {
  if (!autoUpdater) {
    console.log('[Do舟] 自动更新不可用（开发环境或未配置）')
    return
  }
  autoUpdater.checkForUpdatesAndNotify?.()
}

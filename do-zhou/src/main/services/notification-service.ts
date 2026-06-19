/**
 * 桌面通知服务 — AI 生成完成时通过 Electron Notification 提醒用户
 * Spec: 系统通知
 */
import { Notification } from 'electron'

export const notificationService = {
  /**
   * AI 生成完成通知
   */
  notifyComplete(title: string, body: string) {
    if (!Notification.isSupported()) return

    const n = new Notification({
      title: title || 'Do舟',
      body: body || 'AI 生成完成',
      silent: false,
    })

    n.on('click', () => {
      // 点击通知时聚焦主窗口
      const { BrowserWindow } = require('electron')
      const wins = BrowserWindow.getAllWindows()
      if (wins.length > 0) {
        const win = wins[0]
        if (win.isMinimized()) win.restore()
        win.focus()
      }
    })

    n.show()
  },

  /** 错误通知 */
  notifyError(title: string, body: string) {
    if (!Notification.isSupported()) return
    new Notification({ title: title || 'Do舟', body: body || '发生错误', urgency: 'critical' }).show()
  },
}

/**
 * 全局错误捕获 + 上报
 *
 * 捕获未处理的错误和 Promise rejection，记录到日志文件。
 * 生产环境可接入 Sentry 或自定义上报端点。
 */

import * as fs from 'fs'
import * as path from 'path'

export interface ErrorReport {
  timestamp: string
  type: 'uncaughtException' | 'unhandledRejection' | 'rendererError'
  message: string
  stack?: string
  context?: Record<string, unknown>
}

const ERROR_LOG_DIR: string | null = null

export function initErrorReporting(dataRoot: string): void {
  const logDir = path.join(dataRoot, 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  ;(globalThis as Record<string, unknown>).__errorLogDir = logDir

  // 主进程未捕获异常
  process.on('uncaughtException', (error: Error) => {
    logError({ timestamp: new Date().toISOString(), type: 'uncaughtException', message: error.message, stack: error.stack })
    console.error('[Do舟] 未捕获异常:', error.message)
  })

  // 未处理的 Promise rejection
  process.on('unhandledRejection', (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason)
    logError({ timestamp: new Date().toISOString(), type: 'unhandledRejection', message: msg, stack: reason instanceof Error ? reason.stack : undefined })
    console.error('[Do舟] 未处理 rejection:', msg)
  })
}

function logError(report: ErrorReport): void {
  const logDir = (globalThis as Record<string, unknown>).__errorLogDir as string
  if (!logDir) return

  try {
    const logPath = path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`)
    const line = JSON.stringify(report) + '\n'
    fs.appendFileSync(logPath, line, 'utf-8')
  } catch {
    // 日志写入失败不应再抛错
  }
}

/**
 * 渲染进程错误上报入口
 */
export function reportRendererError(message: string, stack?: string): void {
  logError({ timestamp: new Date().toISOString(), type: 'rendererError', message, stack })
}

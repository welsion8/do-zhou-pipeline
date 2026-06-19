import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string

// 设置 __errorLogDir 供 logError 使用
beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-error-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  ;(globalThis as any).__errorLogDir = tmpDir
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('error-reporting', () => {
  it('initErrorReporting → 创建日志目录', async () => {
    const { initErrorReporting } = await import('./error-reporting')
    initErrorReporting(tmpDir)
    expect(fs.existsSync(path.join(tmpDir, 'logs'))).toBe(true)
  })

  it('reportRendererError → 写日志文件', async () => {
    const { reportRendererError } = await import('./error-reporting')
    reportRendererError('test error message', 'Error: test\n  at foo')
    const logDir = (globalThis as any).__errorLogDir as string
    const logFile = path.join(logDir, `error-${new Date().toISOString().split('T')[0]}.log`)
    expect(fs.existsSync(logFile)).toBe(true)
    const content = fs.readFileSync(logFile, 'utf-8')
    expect(content).toContain('test error message')
    expect(content).toContain('rendererError')
  })
})

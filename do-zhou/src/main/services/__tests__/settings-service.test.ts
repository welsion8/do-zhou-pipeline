import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SettingsService } from '../settings-service'

let tmpDir: string
let service: SettingsService

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-${Date.now()}`)
  service = new SettingsService(tmpDir)
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('SettingsService', () => {
  describe('get', () => {
    it('无配置文件 → 返回默认设置', () => {
      const s = service.get()
      expect(s.editor.fontSize).toBe(14)
      expect(s.appearance.theme).toBe('dark')
      expect(s.ai.maxTokens).toBe(4096)
    })
  })

  describe('save', () => {
    it('保存部分字段 → 其余保留默认值', () => {
      const s = service.save({ appearance: { theme: 'light', accentColor: '#fff', language: 'en' } } as any)
      expect(s.appearance.theme).toBe('light')
      expect(s.editor.fontSize).toBe(14) // 未改的保留
    })

    it('持久化到文件 → 重新读取一致', () => {
      service.save({ appearance: { theme: 'light' } } as any)
      const s2 = new SettingsService(tmpDir).get()
      expect(s2.appearance.theme).toBe('light')
    })
  })

  describe('reset', () => {
    it('恢复默认设置', () => {
      service.save({ editor: { fontSize: 99 } } as any)
      const s = service.reset()
      expect(s.editor.fontSize).toBe(14)
    })
  })
})

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadConversation, saveConversation, appendMessage, fromClaudeMessage, toUniversalFormat, getCapabilityNotice } from './session-bridge'

let tmpDir: string

beforeEach(() => { tmpDir = path.join(os.tmpdir(), `do-zhou-test-bridge-${Date.now()}`); fs.mkdirSync(tmpDir, { recursive: true }) })
afterEach(() => { if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true }) })

describe('session-bridge', () => {
  describe('loadConversation', () => {
    it('空目录 → []', () => {
      expect(loadConversation(tmpDir)).toEqual([])
    })

    it('有 JSONL → 解析消息', () => {
      saveConversation(tmpDir, [
        { role: 'user', content: 'hi', timestamp: '2026-01-01T00:00:00Z' },
        { role: 'assistant', content: 'hello', timestamp: '2026-01-01T00:00:01Z' },
      ])
      const msgs = loadConversation(tmpDir)
      expect(msgs).toHaveLength(2)
      expect(msgs[0].content).toBe('hi')
    })
  })

  describe('saveConversation', () => {
    it('写入 JSONL', () => {
      saveConversation(tmpDir, [{ role: 'user', content: 'test', timestamp: new Date().toISOString() }])
      const loaded = loadConversation(tmpDir)
      expect(loaded).toHaveLength(1)
    })
  })

  describe('appendMessage', () => {
    it('追加一条 → 总数+1', () => {
      saveConversation(tmpDir, [{ role: 'user', content: 'a', timestamp: '' }])
      appendMessage(tmpDir, { role: 'assistant', content: 'b', timestamp: '' })
      expect(loadConversation(tmpDir)).toHaveLength(2)
    })
  })

  describe('fromClaudeMessage', () => {
    it('assistant → assistant', () => {
      const msg = fromClaudeMessage({ role: 'assistant', content: 'hi' })
      expect(msg.role).toBe('assistant')
    })
    it('unknown → system', () => {
      const msg = fromClaudeMessage({ role: 'tool', content: '{}' })
      expect(msg.role).toBe('system')
    })
  })

  describe('toUniversalFormat', () => {
    it('转换消息数组', () => {
      const result = toUniversalFormat([
        { role: 'user', content: 'q', timestamp: '' },
        { role: 'assistant', content: 'a', timestamp: '' },
      ])
      expect(result).toHaveLength(2)
      expect(result[0].content).toBe('q')
    })
  })

  describe('getCapabilityNotice', () => {
    it('claude→universal → 降级提示', () => {
      expect(getCapabilityNotice('claude', 'universal')).toContain('暂不可用')
    })
    it('universal→claude → 恢复提示', () => {
      expect(getCapabilityNotice('universal', 'claude')).toContain('已恢复')
    })
    it('相同引擎 → null', () => {
      expect(getCapabilityNotice('claude', 'claude')).toBeNull()
    })
  })
})

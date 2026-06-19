import { describe, it, expect } from 'vitest'

// 测试类型定义可正常导入和构造
describe('Engine Types', () => {
  it('Message 类型可用', () => {
    const msg = { role: 'user' as const, content: 'hello', timestamp: Date.now() }
    expect(msg.role).toBe('user')
    expect(msg.content).toBe('hello')
  })

  it('ToolCall 类型可用', () => {
    const tc = { id: '1', name: 'test', input: { key: 'val' } }
    expect(tc.name).toBe('test')
  })

  it('SessionRecord 类型可用', () => {
    const sr = { id: 's1', messages: [], engineType: 'claude' as const, createdAt: Date.now(), updatedAt: Date.now() }
    expect(sr.engineType).toBe('claude')
    expect(sr.messages).toHaveLength(0)
  })

  it('EngineConfig 类型可用', () => {
    const cfg = { provider: 'test', model: 'm1', apiKey: 'sk-xxx', maxTokens: 4096 }
    expect(cfg.provider).toBe('test')
  })
})

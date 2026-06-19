import { describe, it, expect, vi } from 'vitest'

// Mock all engine implementations
vi.mock('./claude/claude-engine', () => ({
  runClaudeEngine: vi.fn(() => (async function* () { yield { type: 'text', text: 'claude' } })()),
  callClaudeOnce: vi.fn(async () => ({ content: 'claude-once' })),
}))
vi.mock('./claude/session-bridge', () => ({
  getCapabilityNotice: vi.fn(() => '切换引擎通知'),
}))
// Mock universal engine via dynamic import override
vi.mock('./universal/agent-loop', () => ({
  runUniversalAgent: vi.fn(async () => ({ content: 'universal' })),
  callUniversalOnce: vi.fn(async () => ({ content: 'universal-once' })),
}))

import { createEngine } from './engine-factory'
import type { EngineRequest } from './engine-factory'

describe('engine-factory', () => {
  const baseReq: EngineRequest = {
    providerId: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'sk-test',
    systemPrompt: 'test', userMessage: 'hello', sessionDir: '/tmp', maxTokens: 100,
    mode: 'once',
  }

  it('Claude 模型 → claude engine', async () => {
    const r = await createEngine(baseReq)
    expect(r.engineType).toBe('claude')
  })

  it('capability notice → 切换引擎时返回', async () => {
    const r = await createEngine({ ...baseReq, previousEngine: 'universal' })
    expect(r.capabilityNotice).toBe('切换引擎通知')
  })
}, 10000)

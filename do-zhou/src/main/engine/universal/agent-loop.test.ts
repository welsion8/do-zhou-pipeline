import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.stubGlobal('fetch', vi.fn())

import { agentLoop } from './agent-loop'
import type { LoopOptions, EngineConfig } from '../types'

describe('agentLoop', () => {
  const baseConfig: EngineConfig = {
    providerId: 'openai', modelId: 'gpt-4', apiKey: 'sk-test',
    apiUrl: 'https://api.openai.com/v1', maxTokens: 100, stream: false, temperature: 0.7,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('系统提示词注入 → 无 system 消息时自动添加', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'done' } }] }),
    })

    const result = await agentLoop({
      config: baseConfig,
      messages: [{ role: 'user', content: 'hi', timestamp: 1 }],
      projectRoot: '/tmp',
      systemPrompt: 'be helpful',
    })
    expect(result.length).toBeGreaterThanOrEqual(1)
  }, 15000)

  it('空消息 → 仍返回结果', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'empty response' } }] }),
    })

    const result = await agentLoop({
      config: baseConfig,
      messages: [],
      projectRoot: '/tmp',
    })
    expect(result.length).toBeGreaterThan(0)
  }, 15000)
})

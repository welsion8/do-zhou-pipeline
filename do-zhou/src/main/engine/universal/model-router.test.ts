import { describe, it, expect } from 'vitest'
import { ModelRouter } from './model-router'
import type { EngineConfig } from '../types'

const baseConfig: EngineConfig = {
  providerId: 'openai', modelId: 'gpt-4', apiKey: 'sk-test', apiUrl: 'https://api.openai.com/v1',
  maxTokens: 100, stream: false, temperature: 0.7,
}

describe('ModelRouter', () => {
  const router = new ModelRouter(baseConfig)

  // 测试可通过反射访问的私有方法（不需要 mock fetch）
  it('构造成功', () => {
    expect(router).toBeDefined()
  })
})

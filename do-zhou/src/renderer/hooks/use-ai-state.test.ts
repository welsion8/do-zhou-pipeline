import { describe, it, expect, beforeEach } from 'vitest'
import { setAIStreaming, getAIState } from './use-ai-state'

describe('use-ai-state', () => {
  beforeEach(() => {
    // 重置状态
    setAIStreaming(false, null)
  })

  it('初始状态 → isStreaming=false', () => {
    const state = getAIState()
    expect(state.isStreaming).toBe(false)
    expect(state.abortController).toBeNull()
  })

  it('setAIStreaming(true) → getAIState 返回 true', () => {
    const ac = new AbortController()
    setAIStreaming(true, ac)
    expect(getAIState().isStreaming).toBe(true)
    expect(getAIState().abortController).toBe(ac)
  })

  it('setAIStreaming(false) → 恢复初始', () => {
    setAIStreaming(true, new AbortController())
    setAIStreaming(false, null)
    expect(getAIState().isStreaming).toBe(false)
  })
})

/**
 * useAIState — 全局 AI 生成状态（供关闭保护和中断恢复使用）
 *
 * 模块级变量: 任何组件可读写，无需 prop drilling。
 * 对应 Spec: S-61 (AI 生成中断与恢复), S-75 (关闭确认)
 */
import { useState, useCallback } from 'react'

// 模块级状态（单例，跨组件共享）
let globalAIState = {
  isStreaming: false,
  abortController: null as AbortController | null,
}

// 订阅者列表
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export function setAIStreaming(v: boolean, ac?: AbortController | null) {
  globalAIState = { isStreaming: v, abortController: ac || null }
  notify()
}

export function getAIState() {
  return globalAIState
}

export function useAIState() {
  const [, setTick] = useState(0)

  listeners.add(() => setTick(t => t + 1))

  const interrupt = useCallback(() => {
    if (globalAIState.abortController) {
      globalAIState.abortController.abort()
      setAIStreaming(false, null)
    }
  }, [])

  return {
    isStreaming: globalAIState.isStreaming,
    interrupt,
  }
}

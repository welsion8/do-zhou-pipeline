import { useState, useCallback, useEffect } from 'react'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
}

export function useChatEngine() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [tokenUsage, setTokenUsage] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // 启动时自动加载历史会话
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.engine) return
    api.engine.loadSession('default').then(msgs => {
      if (msgs && msgs.length > 0) setMessages(msgs)
    }).catch(() => {})
  }, [])

  const sendMessage = useCallback(async (content: string, projectRoot?: string, systemPrompt?: string) => {
    const api = window.electronAPI
    if (!api?.apiConfig || !api?.engine) { setError('引擎未就绪'); return }

    setError(null)
    setIsStreaming(true)

    // 获取第一个可用的提供商和模型
    const providers = await api.apiConfig.getAll()
    const active = providers.find(p => p.enabled && p.models.length > 0)
    if (!active) { setError('请先在 API 配置中设置并拉取模型'); setIsStreaming(false); return }

    const key = await api.apiConfig.getKey(active.id)
    if (!key) { setError('请先配置 API Key'); setIsStreaming(false); return }

    const userMsg: ChatMessage = { role: 'user', content, timestamp: Date.now() }
    const updated = [...messages, userMsg]
    setMessages(updated)

    try {
      const dataRoot = await api.app?.getDataRoot?.().catch(() => '') || ''
      const fullProjectRoot = dataRoot ? dataRoot.replace(/\\/g, '/') + '/' + (projectRoot || '') : (projectRoot || '')
      const result = await api.engine.chat({
        sessionId: 'default',
        messages: updated,
        projectRoot: fullProjectRoot,
        config: {
          providerId: active.id, modelId: active.models[0],
          apiUrl: active.apiUrl, apiKey: key,
          maxTokens: 4096, stream: false,
        },
        systemPrompt: systemPrompt || '你是 Do 舟的 AI 写作助手。使用工具读写项目文件来帮助用户创作。用中文回复。',
      }) as { success: boolean; messages?: ChatMessage[]; error?: string }

      if (result.success && result.messages) {
        setMessages(result.messages)
      } else {
        setError(result.error || '对话失败')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '对话失败')
    } finally {
      setIsStreaming(false)
    }
  }, [messages])

  const clearMessages = useCallback(() => {
    setMessages([]); setTokenUsage(0); setError(null)
  }, [])

  return { messages, isStreaming, tokenUsage, error, setError, sendMessage, clearMessages }
}

import type { Message, ToolCall, ToolResult, EngineConfig } from '../types'
import { ToolExecutor, TOOL_DEFS } from './tool-executor'
import { ModelRouter } from './model-router'

export interface LoopOptions {
  config: EngineConfig
  messages: Message[]
  projectRoot: string
  systemPrompt?: string
  onToken?: (usage: { prompt: number; completion: number }) => void
  onChunk?: (delta: string) => void
  signal?: AbortSignal
}

const MAX_LOOP = 15 // 防止无限循环

export async function agentLoop(options: LoopOptions): Promise<Message[]> {
  const { config, messages, projectRoot, systemPrompt, onToken, onChunk, signal } = options
  const router = new ModelRouter(config)
  const executor = new ToolExecutor(projectRoot)

  const conversation: Message[] = [...messages]

  // ── 消息校验：API 发送前最后一次防线 ──
  for (const msg of conversation) {
    if (msg.role === 'tool' && !msg.tool_call_id) {
      msg.tool_call_id = `fixup_${Date.now()}` // 修复缺失的 tool_call_id
    }
    if (msg.role === 'assistant' && msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        if (!tc.id) tc.id = `fixup_${Date.now()}_${Math.random().toString(36).slice(2,6)}`
      }
    }
  }

  // 注入系统提示词
  if (systemPrompt && !conversation.some(m => m.role === 'system')) {
    conversation.unshift({ role: 'system', content: systemPrompt, timestamp: Date.now() })
  }

  for (let i = 0; i < MAX_LOOP; i++) {
    if (signal?.aborted) break

    // 调用模型
    const response = await router.chat({
      messages: conversation,
      tools: TOOL_DEFS,
      onChunk,
    })

    // 记录 token 用量
    if (onToken && response.usage) {
      onToken(response.usage)
    }

    const assistantMsg: Message = {
      role: 'assistant',
      content: response.content || '',
      tool_calls: response.toolCalls,
      timestamp: Date.now(),
    }
    conversation.push(assistantMsg)

    // 无工具调用 → 对话结束
    if (!response.toolCalls || response.toolCalls.length === 0) break

    // 执行工具调用
    for (const tc of response.toolCalls) {
      if (signal?.aborted) break
      const result = await executor.execute(tc)
      conversation.push({
        role: 'tool',
        content: result.error ? `错误: ${result.error}\n${result.content}` : result.content,
        name: tc.function.name,
        tool_call_id: tc.id,
        timestamp: Date.now(),
      })
    }
  }

  return conversation
}

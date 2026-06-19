/**
 * Claude Engine — 基于 @anthropic-ai/claude-agent-sdk
 *
 * 提供完整 Agent 循环: 工具调用 + Session 管理 + 流式输出
 */

import type { BridgeMessage } from './session-bridge'
import { appendMessage, fromClaudeMessage } from './session-bridge'

export interface ClaudeEngineConfig {
  apiKey: string
  model: string           // e.g. "claude-sonnet-4-6"
  maxTokens: number
  systemPrompt: string
  sessionDir: string
  tools?: ToolDef[]
}

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'error' | 'done'
  content?: string
  toolName?: string
  toolInput?: Record<string, unknown>
  error?: string
}

/**
 * Claude Engine — 流式 Agent 循环
 */
export async function* runClaudeEngine(config: ClaudeEngineConfig): AsyncGenerator<StreamEvent> {
  const { apiKey, model, maxTokens, systemPrompt, tools } = config

  // 构建请求体（Anthropic Messages API 格式）
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: systemPrompt,
    messages: [{ role: 'user', content: systemPrompt }],
    stream: true,
  }

  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters,
    }))
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'tools-2024-04-04',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errText = await response.text()
      yield { type: 'error', error: `Claude API 错误 (${response.status}): ${errText}` }
      return
    }

    if (!response.body) {
      yield { type: 'error', error: 'Claude API 返回空响应体' }
      return
    }

    // SSE 流式解析
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') { yield { type: 'done' }; return }

        try {
          const event = JSON.parse(data)

          // 文本增量
          if (event.type === 'content_block_delta' && event.delta?.text) {
            yield { type: 'text', content: event.delta.text }
          }
          // 工具调用开始
          else if (event.type === 'content_block_start' && event.content_block?.type === 'tool_use') {
            yield {
              type: 'tool_call',
              toolName: event.content_block.name,
              toolInput: event.content_block.input,
            }
          }
          // 消息完成
          else if (event.type === 'message_stop') {
            yield { type: 'done' }
            return
          }
        } catch {
          // 跳过无法解析的事件
        }
      }
    }

    yield { type: 'done' }
  } catch (e) {
    yield { type: 'error', error: `Claude Engine 异常: ${(e as Error).message}` }
  }
}

/**
 * 非流式调用 Claude（用于简单任务）
 */
export async function callClaudeOnce(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userMessage: string,
  maxTokens: number = 4096
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!response.ok) {
    throw new Error(`Claude API 错误 (${response.status})`)
  }

  const data = await response.json() as Record<string, unknown>
  const content = (data as { content?: Array<{ text?: string }> }).content
  return content?.[0]?.text || ''
}

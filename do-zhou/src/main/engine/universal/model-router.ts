import type { Message, ToolCall, ToolDef, EngineConfig } from '../types'

interface ChatRequest {
  messages: Message[]
  tools?: ToolDef[]
  onChunk?: (delta: string) => void
}

interface ChatResponse {
  content: string
  toolCalls?: ToolCall[]
  usage?: { prompt: number; completion: number }
}

const MAX_RETRIES = 3
const RETRY_DELAYS = [1000, 3000, 8000]

export class ModelRouter {
  private config: EngineConfig

  constructor(config: EngineConfig) {
    this.config = config
  }

  async chat(req: ChatRequest): Promise<ChatResponse> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (this.config.stream) {
          return await this.streamChat(req)
        }
        return await this.syncChat(req)
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e))
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt] || 8000))
        }
      }
    }
    throw lastError || new Error('请求失败，已达最大重试次数')
  }

  private buildBody(req: ChatRequest): Record<string, unknown> {
    const msgs = req.messages.map(m => {
      const out: Record<string, unknown> = { role: m.role, content: m.content }
      if (m.tool_calls) out.tool_calls = m.tool_calls
      if (m.name) out.name = m.name
      if (m.tool_call_id) out.tool_call_id = m.tool_call_id
      return out
    })

    const body: Record<string, unknown> = {
      model: this.config.modelId,
      messages: msgs,
      max_tokens: this.config.maxTokens || 4096,
      temperature: this.config.temperature ?? 0.7,
    }
    if (req.tools && req.tools.length > 0) {
      body.tools = req.tools
      body.tool_choice = 'auto'
    }
    return body
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }
  }

  private async syncChat(req: ChatRequest): Promise<ChatResponse> {
    const resp = await fetch(`${this.config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildBody(req)),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${await resp.text().catch(() => resp.statusText)}`)
    const data = await resp.json() as Record<string, unknown>
    return this.parseResponse(data)
  }

  private async streamChat(req: ChatRequest): Promise<ChatResponse> {
    const body = { ...this.buildBody(req), stream: true }
    const resp = await fetch(`${this.config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    if (!resp.body) throw new Error('响应无 body')

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let content = ''
    const toolCalls: Map<number, ToolCall> = new Map()
    let usage = { prompt: 0, completion: 0 }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') continue
        try {
          const parsed = JSON.parse(data)
          const choice = parsed.choices?.[0]
          if (!choice) continue

          const delta = choice.delta
          if (delta?.content) {
            content += delta.content
            req.onChunk?.(delta.content)
          }
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0
              if (!toolCalls.has(idx)) {
                toolCalls.set(idx, {
                  id: tc.id || `call_${idx}`,
                  type: 'function',
                  function: { name: tc.function?.name || '', arguments: '' },
                })
              }
              const existing = toolCalls.get(idx)!
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments
              if (tc.id) existing.id = tc.id
            }
          }
          if (parsed.usage) usage = parsed.usage
        } catch { /* 忽略解析错误 */ }
      }
    }

    return {
      content,
      toolCalls: toolCalls.size > 0 ? [...toolCalls.values()] : undefined,
      usage,
    }
  }

  private parseResponse(data: Record<string, unknown>): ChatResponse {
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0]
    if (!choice) throw new Error('响应中无 choices')
    const msg = choice.message as Record<string, unknown> | undefined
    return {
      content: (msg?.content as string) || '',
      toolCalls: msg?.tool_calls as ToolCall[] | undefined,
      usage: data.usage as { prompt: number; completion: number } | undefined,
    }
  }
}

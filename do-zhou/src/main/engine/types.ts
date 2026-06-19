// ── 会话与消息 ──
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string          // 工具名（role=tool 时）
  tool_call_id?: string  // 工具调用 ID
  tool_calls?: ToolCall[]
  timestamp: number
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string  // JSON string
  }
}

export interface ToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

// ── 会话持久化 ──
export interface SessionRecord {
  id: string
  projectPath: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

// ── 引擎配置 ──
export interface EngineConfig {
  providerId: string
  modelId: string
  apiUrl: string
  apiKey: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

// ── 工具执行结果 ──
export interface ToolResult {
  tool_call_id: string
  content: string
  error?: string
}

// ── Token 统计 ──
export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

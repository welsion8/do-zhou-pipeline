/**
 * Session 跨引擎桥接 — Claude Engine ↔ Universal Engine 对话历史互通
 *
 * 统一存储格式: .session/conversation.jsonl（每行一条 JSON 消息）
 */

import * as fs from 'fs'
import * as path from 'path'

export interface BridgeMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  timestamp: string  // ISO8601
}

/**
 * 从 JSONL 文件读取通用格式的对话历史
 */
export function loadConversation(sessionDir: string): BridgeMessage[] {
  const jsonlPath = path.join(sessionDir, 'conversation.jsonl')
  if (!fs.existsSync(jsonlPath)) return []

  try {
    const content = fs.readFileSync(jsonlPath, 'utf-8')
    return content.split('\n')
      .filter(line => line.trim())
      .map(line => {
        try { return JSON.parse(line) as BridgeMessage }
        catch { return null }
      })
      .filter(Boolean) as BridgeMessage[]
  } catch {
    return []
  }
}

/**
 * 将对话历史导出为通用 JSONL 格式
 */
export function saveConversation(sessionDir: string, messages: BridgeMessage[]): void {
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })

  const jsonlPath = path.join(sessionDir, 'conversation.jsonl')
  const content = messages.map(m => JSON.stringify(m)).join('\n') + '\n'
  fs.writeFileSync(jsonlPath, content, 'utf-8')
}

/**
 * 追加一条消息到会话
 */
export function appendMessage(sessionDir: string, message: BridgeMessage): void {
  const jsonlPath = path.join(sessionDir, 'conversation.jsonl')
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true })
  fs.appendFileSync(jsonlPath, JSON.stringify(message) + '\n', 'utf-8')
}

/**
 * Claude SDK 消息格式 → 通用 BridgeMessage
 */
export function fromClaudeMessage(msg: { role: string; content: string }): BridgeMessage {
  return {
    role: (msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : 'system') as BridgeMessage['role'],
    content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
    timestamp: new Date().toISOString(),
  }
}

/**
 * 通用 BridgeMessage → Universal Engine 格式
 */
export function toUniversalFormat(messages: BridgeMessage[]): Array<{ role: string; content: string }> {
  return messages.map(m => ({ role: m.role, content: m.content }))
}

/**
 * 检查引擎切换是否需要能力降级提示
 */
export function getCapabilityNotice(fromEngine: string, toEngine: string): string | null {
  if (fromEngine === 'claude' && toEngine === 'universal') {
    return '⚠ 已切换至 Universal Engine，部分高级能力（MCP、子Agent）暂不可用'
  }
  if (fromEngine === 'universal' && toEngine === 'claude') {
    return '✅ 已切换至 Claude Engine，高级 Agent 能力已恢复'
  }
  return null
}

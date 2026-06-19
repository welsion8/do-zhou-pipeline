/**
 * 引擎工厂 — 模型路由 + 重试策略
 */
import type { BridgeMessage } from './claude/session-bridge'
import { getCapabilityNotice } from './claude/session-bridge'
import type { StreamEvent } from './claude/claude-engine'

export type EngineType = 'claude' | 'universal'
export type EngineMode = 'stream' | 'once'

export interface EngineRequest {
  providerId: string; model: string; apiKey: string; apiUrl?: string
  systemPrompt: string; userMessage: string; sessionDir: string
  maxTokens: number; mode: EngineMode; previousEngine?: EngineType
  maxRetries?: number
}

export interface EngineResult {
  engineType: EngineType; capabilityNotice: string | null
  stream?: AsyncGenerator<StreamEvent>; content?: string; error?: string
}

const CLAUDE_PREFIXES = ['claude-', 'claudeopus', 'claudesonnet', 'claudehaiku']

function isClaude(providerId: string, model: string): boolean {
  if (providerId.toLowerCase() === 'openrouter') return false
  return CLAUDE_PREFIXES.some(p => model.toLowerCase().startsWith(p))
}

export async function createEngine(req: EngineRequest): Promise<EngineResult> {
  const engineType = isClaude(req.providerId, req.model) ? 'claude' : 'universal'
  const notice = req.previousEngine ? getCapabilityNotice(req.previousEngine, engineType) : null
  const maxRetries = req.maxRetries ?? 3

  let lastError: string | undefined
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const result = engineType === 'claude' ? await doClaude(req) : await doUniversal(req)
    if (!result.error) return { ...result, capabilityNotice: notice }
    lastError = result.error
    if (attempt < maxRetries) await new Promise(r => setTimeout(r, 1000 * (attempt + 1)))
  }
  return { engineType, capabilityNotice: notice, error: `重试 ${maxRetries} 次后仍失败: ${lastError}` }
}

async function doClaude(req: EngineRequest): Promise<EngineResult> {
  const { runClaudeEngine, callClaudeOnce } = await import('./claude/claude-engine')
  if (req.mode === 'stream') {
    return { engineType: 'claude', capabilityNotice: null, stream: runClaudeEngine({ apiKey: req.apiKey, model: req.model, maxTokens: req.maxTokens, systemPrompt: req.systemPrompt, sessionDir: req.sessionDir }) }
  }
  try {
    const content = await callClaudeOnce(req.apiKey, req.model, req.systemPrompt, req.userMessage, req.maxTokens)
    return { engineType: 'claude', capabilityNotice: null, content }
  } catch (e) { return { engineType: 'claude', capabilityNotice: null, error: (e as Error).message } }
}

async function doUniversal(req: EngineRequest): Promise<EngineResult> {
  const apiUrl = req.apiUrl || 'https://api.openai.com/v1/chat/completions'
  try {
    const resp = await fetch(apiUrl, { method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${req.apiKey}` },
      body: JSON.stringify({ model: req.model, messages: [{ role: 'system', content: req.systemPrompt }, { role: 'user', content: req.userMessage }], max_tokens: req.maxTokens, stream: req.mode === 'stream' }) })
    if (!resp.ok) return { engineType: 'universal', capabilityNotice: null, error: `API ${resp.status}` }
    if (req.mode === 'stream') return { engineType: 'universal', capabilityNotice: null, stream: parseStream(resp) }
    const data = await resp.json() as Record<string, unknown>
    const choices = data.choices as Array<{ message?: { content?: string } }>
    return { engineType: 'universal', capabilityNotice: null, content: choices?.[0]?.message?.content || '' }
  } catch (e) { return { engineType: 'universal', capabilityNotice: null, error: (e as Error).message } }
}

async function* parseStream(resp: Response): AsyncGenerator<StreamEvent> {
  if (!resp.body) { yield { type: 'error', error: '空响应体' }; return }
  const reader = resp.body.getReader(); const decoder = new TextDecoder(); let buf = ''
  while (true) { const { done, value } = await reader.read(); if (done) break
    buf += decoder.decode(value, { stream: true }); const lines = buf.split('\n'); buf = lines.pop() || ''
    for (const line of lines) { if (!line.startsWith('data: ')) continue; const d = line.slice(6).trim(); if (d === '[DONE]') { yield { type: 'done' }; return }
      try { const e = JSON.parse(d); const delta = e.choices?.[0]?.delta?.content; if (delta) yield { type: 'text', content: delta } } catch { /* skip */ } } }
  yield { type: 'done' }
}

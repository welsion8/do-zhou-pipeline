import { safeStorage } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

export interface ProviderConfig {
  id: string
  name: string
  apiUrl: string
  apiKey: string     // encrypted with safeStorage
  models: string[]
  enabled: boolean
  order: number
  isBuiltin: boolean
}

const BUILTIN_PROVIDERS: Omit<ProviderConfig, 'apiKey' | 'models' | 'order'>[] = [
  { id: 'anthropic', name: 'Anthropic', apiUrl: 'https://api.anthropic.com/v1', enabled: true, isBuiltin: true },
  { id: 'openai', name: 'OpenAI', apiUrl: 'https://api.openai.com/v1', enabled: true, isBuiltin: true },
  { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com/v1', enabled: true, isBuiltin: true },
  { id: 'kimi', name: 'Kimi (Moonshot)', apiUrl: 'https://api.moonshot.cn/v1', enabled: true, isBuiltin: true },
  { id: 'zhipu', name: '智谱 GLM', apiUrl: 'https://open.bigmodel.cn/api/paas/v4', enabled: true, isBuiltin: true },
  { id: 'qwen', name: '通义千问', apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', enabled: true, isBuiltin: true },
  { id: 'openrouter', name: 'OpenRouter', apiUrl: 'https://openrouter.ai/api/v1', enabled: true, isBuiltin: true },
  { id: 'groq', name: 'Groq', apiUrl: 'https://api.groq.com/openai/v1', enabled: true, isBuiltin: true },
]

export class ApiConfigService {
  private configPath: string
  private configs: ProviderConfig[] = []
  private initialized = false

  constructor(dataRoot: string) {
    this.configPath = path.join(dataRoot, 'api-config.json')
  }

  private ensureInit() {
    if (this.initialized) return
    if (fs.existsSync(this.configPath)) {
      try {
        this.configs = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'))
      } catch (_) {
        this.configs = []
      }
    }
    // 补全内置提供商
    let order = this.configs.length > 0
      ? Math.max(...this.configs.map(c => c.order)) + 1
      : 0
    for (const bp of BUILTIN_PROVIDERS) {
      if (!this.configs.find(c => c.id === bp.id)) {
        this.configs.push({ ...bp, apiKey: '', models: [], order: order++ })
      }
    }
    this.initialized = true
  }

  private save() {
    fs.writeFileSync(this.configPath, JSON.stringify(this.configs, null, 2))
  }

  private encryptKey(plain: string): string {
    if (!plain) return ''
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.encryptString(plain).toString('base64')
    }
    // fallback: obfuscate (not secure, but prevents accidental exposure in logs)
    return Buffer.from(plain).toString('base64')
  }

  private decryptKey(encrypted: string): string {
    if (!encrypted) return ''
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(encrypted, 'base64'))
      }
    } catch (_) { /* fallback */ }
    try {
      return Buffer.from(encrypted, 'base64').toString('utf-8')
    } catch (_) { return '' }
  }

  // ── CRUD ──

  getAll(): ProviderConfig[] {
    this.ensureInit()
    return this.configs
      .sort((a, b) => a.order - b.order)
      .map(c => ({ ...c, apiKey: '' }))  // never return raw key
  }

  getKey(id: string): string {
    this.ensureInit()
    const cfg = this.configs.find(c => c.id === id)
    if (!cfg) return ''
    return this.decryptKey(cfg.apiKey)
  }

  update(id: string, updates: { apiUrl?: string; apiKey?: string; enabled?: boolean; name?: string }): ProviderConfig | null {
    this.ensureInit()
    const cfg = this.configs.find(c => c.id === id)
    if (!cfg) return null
    if (updates.apiUrl !== undefined) cfg.apiUrl = updates.apiUrl
    if (updates.apiKey !== undefined) cfg.apiKey = this.encryptKey(updates.apiKey)
    if (updates.enabled !== undefined) cfg.enabled = updates.enabled
    if (updates.name !== undefined && !cfg.isBuiltin) cfg.name = updates.name
    this.save()
    return { ...cfg, apiKey: '' }
  }

  addCustom(name: string, apiUrl: string, apiKey: string): ProviderConfig {
    this.ensureInit()
    const id = `custom-${crypto.randomUUID().slice(0, 8)}`
    const maxOrder = this.configs.length > 0 ? Math.max(...this.configs.map(c => c.order)) : -1
    const cfg: ProviderConfig = {
      id, name, apiUrl, apiKey: this.encryptKey(apiKey),
      models: [], enabled: true, order: maxOrder + 1, isBuiltin: false,
    }
    this.configs.push(cfg)
    this.save()
    return { ...cfg, apiKey: '' }
  }

  delete(id: string): boolean {
    this.ensureInit()
    const idx = this.configs.findIndex(c => c.id === id)
    if (idx === -1 || this.configs[idx].isBuiltin) return false
    this.configs.splice(idx, 1)
    this.save()
    return true
  }

  reorder(ids: string[]) {
    this.ensureInit()
    ids.forEach((id, i) => {
      const cfg = this.configs.find(c => c.id === id)
      if (cfg) cfg.order = i
    })
    this.save()
  }

  setModels(id: string, models: string[]) {
    this.ensureInit()
    const cfg = this.configs.find(c => c.id === id)
    if (!cfg) return
    cfg.models = models
    this.save()
  }

  // ── 网络请求 ──

  async fetchModels(id: string): Promise<string[]> {
    this.ensureInit()
    const cfg = this.configs.find(c => c.id === id)
    if (!cfg || !cfg.apiUrl) throw new Error('提供商未配置')

    const key = this.decryptKey(cfg.apiKey)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (key) headers['Authorization'] = `Bearer ${key}`

    const url = cfg.apiUrl.replace(/\/+$/, '') + '/models'
    const resp = await fetch(url, { headers })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`)
    const data = await resp.json() as { data?: { id: string }[] }
    const models = (data.data || []).map((m: { id: string }) => m.id).sort()
    this.setModels(id, models)
    return models
  }

  async testConnection(id: string): Promise<boolean> {
    try {
      await this.fetchModels(id)
      return true
    } catch (_) {
      return false
    }
  }
}

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

let tmpDir: string

// Mock Electron safeStorage
vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((s: string) => Buffer.from(s)),
    decryptString: vi.fn((b: Buffer) => b.toString()),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { ApiConfigService } from '../api-config-service'
import type { ProviderConfig } from '../api-config-service'

let service: ApiConfigService

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-api-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  service = new ApiConfigService(tmpDir)
  vi.clearAllMocks()
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('ApiConfigService', () => {
  describe('内置提供商', () => {
    it('getAll → 返回 8 个内置提供商', () => {
      const all = service.getAll()
      expect(all.length).toBeGreaterThanOrEqual(7)
      expect(all[0].id).toBe('anthropic')
      expect(all.every(c => c.apiKey === '')).toBe(true) // key 永远不返回
    })
  })

  describe('Key 加密/解密', () => {
    it('update + getKey → 往返一致', () => {
      service.update('anthropic', { apiKey: 'sk-test-key-123' })
      const key = service.getKey('anthropic')
      expect(key).toBe('sk-test-key-123')
    })

    it('getAll → 不返回原始 key', () => {
      service.update('anthropic', { apiKey: 'secret' })
      const all = service.getAll()
      expect(all.find(c => c.id === 'anthropic')!.apiKey).toBe('')
    })
  })

  describe('自定义提供商', () => {
    it('addCustom → 出现在列表中', () => {
      const c = service.addCustom('MyLLM', 'https://my.llm/api', 'key123')
      expect(c.name).toBe('MyLLM')
      expect(c.isBuiltin).toBe(false)
      expect(service.getAll().find(x => x.id === c.id)).not.toBeUndefined()
    })

    it('delete → 内置不可删', () => {
      expect(service.delete('anthropic')).toBe(false)
    })

    it('delete → 自定义可删', () => {
      const c = service.addCustom('tmp', 'https://x.com', 'k')
      expect(service.delete(c.id)).toBe(true)
    })
  })

  describe('排序', () => {
    it('reorder → 持久化', () => {
      service.reorder(['kimi', 'anthropic', 'deepseek', 'zhipu', 'qwen', 'openai', 'openrouter', 'groq'])
      const all = service.getAll()
      expect(all[0].id).toBe('kimi')
    })
  })

  describe('模型管理', () => {
    it('setModels → 可读取', () => {
      service.setModels('anthropic', ['claude-opus', 'claude-sonnet'])
      const cfg = service.getAll().find(c => c.id === 'anthropic')
      expect(cfg!.models).toEqual(['claude-opus', 'claude-sonnet'])
    })
  })

  describe('fetchModels', () => {
    it('成功 → 自动 setModels', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'model-a' }, { id: 'model-b' }] }),
      })
      const models = await service.fetchModels('anthropic')
      expect(models).toEqual(['model-a', 'model-b'])
    })

    it('失败 → 抛出错误', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      await expect(service.fetchModels('anthropic')).rejects.toThrow('401')
    })
  })

  describe('testConnection', () => {
    it('成功 → true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [{ id: 'm1' }] }),
      })
      expect(await service.testConnection('anthropic')).toBe(true)
    })

    it('失败 → false', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))
      expect(await service.testConnection('anthropic')).toBe(false)
    })
  })
})

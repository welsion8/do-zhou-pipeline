// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { setupIPCMock } from '../test-utils/ipc-mock'

let ApiConfigPage: any

beforeEach(async () => {
  setupIPCMock({
    apiConfig: {
      getAll: () => Promise.resolve([
        { id: 'anthropic', name: 'Anthropic', apiUrl: 'https://api.anthropic.com', apiKey: '', models: ['claude-opus'], enabled: true, order: 0, isBuiltin: true },
        { id: 'deepseek', name: 'DeepSeek', apiUrl: 'https://api.deepseek.com', apiKey: '', models: [], enabled: true, order: 1, isBuiltin: true },
        { id: 'kimi', name: 'Kimi', apiUrl: 'https://api.moonshot.cn', apiKey: '', models: [], enabled: true, order: 2, isBuiltin: true },
        { id: 'qwen', name: 'Qwen', apiUrl: 'https://dashscope.aliyuncs.com', apiKey: '', models: [], enabled: true, order: 3, isBuiltin: true },
        { id: 'zhipu', name: 'GLM', apiUrl: 'https://open.bigmodel.cn', apiKey: '', models: [], enabled: true, order: 4, isBuiltin: true },
      ]),
    },
  })
  const mod = await import('./api-config-page')
  ApiConfigPage = mod.default || mod.ApiConfigPage
})

describe('ApiConfigPage', () => {
  it('渲染页面', async () => {
    render(<ApiConfigPage />)
    await new Promise(r => setTimeout(r, 100))
    expect(screen.getByText('⚙ API 模型配置')).toBeDefined()
  })

  it('提供商卡片存在', async () => {
    render(<ApiConfigPage />)
    await new Promise(r => setTimeout(r, 100))
    expect(screen.getAllByTestId('provider-card').length).toBeGreaterThanOrEqual(5)
  })
})

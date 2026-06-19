// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ProviderCard } from './provider-card'

const baseProvider = {
  id: 'anthropic', name: 'Anthropic', apiUrl: 'https://api.anthropic.com', apiKey: '', models: ['claude-opus'], enabled: true, isBuiltin: true, order: 0,
}

describe('ProviderCard', () => {
  it('渲染提供商名称', () => {
    render(<ProviderCard provider={baseProvider} onUpdate={vi.fn()} onDelete={vi.fn()} onSetDefault={vi.fn()} onFetchModels={vi.fn()} onTestConnection={vi.fn()} />)
    expect(screen.getByTestId('provider-card')).toBeDefined()
  })

  it('展开后显示操作按钮', () => {
    render(<ProviderCard provider={baseProvider} onUpdate={vi.fn()} onDelete={vi.fn()} onSetDefault={vi.fn()} onFetchModels={vi.fn()} onTestConnection={vi.fn()} />)
    expect(screen.getByTestId('btn-check-connection')).toBeDefined()
  })
})

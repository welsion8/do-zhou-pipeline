// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ModelDropdown } from './model-dropdown'

describe('ModelDropdown', () => {
  it('渲染模型列表', () => {
    const { container } = render(<ModelDropdown onClose={vi.fn()} onSelectModel={vi.fn()} onOpenConfig={vi.fn()} />)
    expect(container.querySelector('[data-testid="model-option"]')).toBeDefined()
  })

  it('管理API入口存在', () => {
    render(<ModelDropdown onClose={vi.fn()} onSelectModel={vi.fn()} onOpenConfig={vi.fn()} />)
    expect(screen.getByText(/管理 API/)).toBeDefined()
  })
})

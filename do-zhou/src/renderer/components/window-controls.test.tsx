// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WindowControls } from './window-controls'

vi.stubGlobal('electronAPI', {
  window: { minimize: vi.fn(), maximize: vi.fn(), close: vi.fn(), isMaximized: vi.fn(() => Promise.resolve(false)) },
})

describe('WindowControls', () => {
  it('渲染三个按钮', () => {
    render(<WindowControls />)
    expect(screen.getByLabelText('最小化')).toBeDefined()
    expect(screen.getByLabelText('最大化')).toBeDefined()
    expect(screen.getByLabelText('关闭')).toBeDefined()
  })

  it('点击关闭 → 调用 API', () => {
    render(<WindowControls />)
    fireEvent.click(screen.getByLabelText('关闭'))
    expect(window.electronAPI.window.close).toHaveBeenCalled()
  })
})

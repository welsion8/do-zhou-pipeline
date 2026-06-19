// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToggleSwitch } from './toggle-switch'

describe('ToggleSwitch', () => {
  it('渲染标签', () => {
    render(<ToggleSwitch checked={true} onChange={vi.fn()} label="自动保存" />)
    expect(screen.getByText('自动保存')).toBeDefined()
  })

  it('无标签 → 仅有切换按钮', () => {
    const { container } = render(<ToggleSwitch checked={false} onChange={vi.fn()} />)
    expect(container.querySelector('button')).toBeDefined()
  })

  it('点击切换 → 触发 onChange', () => {
    const onChange = vi.fn()
    const { container } = render(<ToggleSwitch checked={false} onChange={onChange} />)
    fireEvent.click(container.querySelector('button')!)
    expect(onChange).toHaveBeenCalledWith(true)
  })
})

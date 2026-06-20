// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toolbar } from './toolbar'

describe('Toolbar', () => {
  it('渲染工具栏', () => {
    render(<Toolbar />)
    expect(screen.getByTestId('btn-home')).toBeDefined()
    expect(screen.getByTestId('btn-model-switch')).toBeDefined()
    expect(screen.getByTestId('btn-settings')).toBeDefined()
  })

  it('显示 Skill/项目名', () => {
    render(<Toolbar skillName="🎬 现代言情" projectName="霸总契约新娘" />)
    expect(screen.getByText('霸总契约新娘')).toBeDefined()
  })

  it('点击主页按钮 → 触发回调', () => {
    const onHome = vi.fn()
    render(<Toolbar onHomeClick={onHome} />)
    screen.getByTestId('btn-home').click()
    expect(onHome).toHaveBeenCalled()
  })
})

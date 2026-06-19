// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBar } from './status-bar'

describe('StatusBar', () => {
  it('渲染快捷键盘提示', () => {
    render(<StatusBar cursorLine={12} cursorCol={48} autoSaved={true} />)
    expect(screen.getByText(/快捷键/)).toBeDefined()
    expect(screen.getByText(/自动保存/)).toBeDefined()
    expect(screen.getByText(/行 12/)).toBeDefined()
  })

  it('未保存状态仍渲染', () => {
    render(<StatusBar cursorLine={1} cursorCol={10} autoSaved={false} />)
    expect(screen.getByText(/行 1/)).toBeDefined()
  })
})

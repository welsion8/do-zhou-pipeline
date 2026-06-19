// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DropdownSelect } from './dropdown-select'

const options = [
  { label: 'Source Han Serif', value: 'source-han' },
  { label: 'Noto Serif SC', value: 'noto' },
  { label: 'Inter', value: 'inter' },
]

describe('DropdownSelect', () => {
  it('渲染当前选中值', () => {
    render(<DropdownSelect options={options} value="inter" onChange={vi.fn()} />)
    expect(screen.getByText('Inter')).toBeDefined()
  })

  it('点击展开下拉', () => {
    render(<DropdownSelect options={options} value="inter" onChange={vi.fn()} />)
    fireEvent.click(screen.getByText('Inter'))
    expect(screen.getByText('Source Han Serif')).toBeDefined()
  })
})

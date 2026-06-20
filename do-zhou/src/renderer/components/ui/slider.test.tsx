// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Slider } from './slider'

describe('Slider', () => {
  it('渲染滑块', () => {
    render(<Slider min={12} max={24} value={16} onChange={vi.fn()} label="字号" />)
    expect(screen.getByText('字号')).toBeDefined()
    expect(screen.getByText('字号')).toBeDefined()
  })
})

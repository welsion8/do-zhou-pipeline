// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FabButton } from './fab-button'

describe('FabButton', () => {
  it('渲染浮动按钮', () => {
    const { container } = render(<FabButton onClick={() => {}} />)
    expect(container.querySelector('[aria-label="AI 对话"]')).toBeDefined()
  })
})

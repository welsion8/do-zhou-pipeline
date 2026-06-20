// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { setupIPCMock } from '../../test-utils/ipc-mock'

let EditorWorkspace: any

beforeEach(async () => {
  setupIPCMock()
  const mod = await import('./editor-workspace')
  EditorWorkspace = mod.default || mod.EditorWorkspace
})

describe('EditorWorkspace', () => {
  it('渲染编辑区', async () => {
    const { container } = render(<EditorWorkspace />)
    await new Promise(r => setTimeout(r, 100))
    expect(container.querySelector('[data-testid="editor-content"]')).toBeDefined()
    expect(container.querySelector('[data-testid="editor-toolbar"]')).toBeDefined()
  })
})

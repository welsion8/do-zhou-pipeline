// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render } from '@testing-library/react'
import { setupIPCMock } from '../../test-utils/ipc-mock'

let AppLayout: any

beforeEach(async () => {
  setupIPCMock()
  const mod = await import('./app-layout')
  AppLayout = mod.AppLayout || mod.default
})

describe('AppLayout', () => {
  it('渲染三栏布局', async () => {
    const { container } = render(<AppLayout activeProject="test" projectPath="/t" activeSkill="现代言情" selectedModel="Claude Opus" openTabs={[]} activeTab="" onSelectTab={vi.fn()} onCloseTab={vi.fn()} />)
    await new Promise(r => setTimeout(r, 100))
    expect(container.querySelector('[data-testid="btn-home"]')).toBeDefined()
  })
})

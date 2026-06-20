// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { setupIPCMock } from '../test-utils/ipc-mock'

let SettingsPage: any

beforeEach(async () => {
  setupIPCMock()
  const mod = await import('./settings-page')
  SettingsPage = mod.default || mod.SettingsPage
})

describe('SettingsPage', () => {
  it('渲染设置页面', async () => {
    render(<SettingsPage />)
    await new Promise(r => setTimeout(r, 100))
    expect(screen.getByText('⚙ 设置')).toBeDefined()
  })

  it('设置标签导航存在', async () => {
    render(<SettingsPage />)
    await new Promise(r => setTimeout(r, 100))
    const tabs = screen.getAllByTestId('settings-tab')
    expect(tabs.length).toBeGreaterThanOrEqual(4)
  })
})

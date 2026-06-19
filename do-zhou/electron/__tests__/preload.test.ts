import { describe, it, expect, vi } from 'vitest'

let exposedAPI: any = null

vi.mock('electron', () => ({
  contextBridge: {
    exposeInMainWorld: vi.fn((_key: string, api: any) => { exposedAPI = api }),
  },
  ipcRenderer: {
    send: vi.fn(),
    invoke: vi.fn(),
  },
}))

describe('preload API', () => {
  it('API 结构完整', async () => {
    await import('../preload')
    expect(exposedAPI).not.toBeNull()
    expect(exposedAPI.window).toBeDefined()
    expect(exposedAPI.file).toBeDefined()
    expect(exposedAPI.project).toBeDefined()
    expect(exposedAPI.trash).toBeDefined()
    expect(exposedAPI.apiConfig).toBeDefined()
    expect(exposedAPI.skill).toBeDefined()
    expect(exposedAPI.settings).toBeDefined()
    expect(exposedAPI.backup).toBeDefined()
    expect(exposedAPI.engine).toBeDefined()
    expect(exposedAPI.tool).toBeDefined()
    expect(exposedAPI.app).toBeDefined()
  })

  it('platform 为当前系统', async () => {
    await import('../preload')
    expect(['darwin', 'win32', 'linux']).toContain(exposedAPI.platform)
  })

  it('file 服务 ≥7 个方法', async () => {
    await import('../preload')
    expect(Object.keys(exposedAPI.file).length).toBeGreaterThanOrEqual(7)
  })

  it('project 服务 ≥6 个方法', async () => {
    await import('../preload')
    expect(Object.keys(exposedAPI.project).length).toBeGreaterThanOrEqual(6)
  })

  it('engine 服务', async () => {
    await import('../preload')
    expect(exposedAPI.engine.chat).toBeInstanceOf(Function)
    expect(exposedAPI.engine.loadSession).toBeInstanceOf(Function)
  })
})

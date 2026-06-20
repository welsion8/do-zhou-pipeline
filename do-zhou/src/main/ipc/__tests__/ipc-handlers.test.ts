import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const tmpDir = path.join(os.tmpdir(), `do-zhou-ipc-test-${Date.now()}`)
fs.mkdirSync(tmpDir, { recursive: true })

const handleSpy = vi.fn()

vi.mock('electron', () => ({
  ipcMain: { handle: handleSpy },
  safeStorage: { isEncryptionAvailable: () => false, encryptString: (s: string) => Buffer.from(s), decryptString: (b: Buffer) => b.toString() },
  app: { getPath: () => tmpDir },
  BrowserWindow: { getAllWindows: () => [] },
  Notification: { isSupported: () => false },
}))

describe('IPC Handlers', () => {
  beforeEach(() => handleSpy.mockClear())

  it('file-ipc → registerFileIpc() 注册 14 个 handlers', async () => {
    const { registerFileIpc } = await import('../file-ipc')
    registerFileIpc()
    const channels = handleSpy.mock.calls.map((c: any) => c[0])
    expect(channels).toContain('file:read')
    expect(channels).toContain('project:create')
    expect(channels).toContain('trash:list')
    expect(channels).toContain('app:getDataRoot')
    expect(channels.length).toBeGreaterThanOrEqual(14)
  }, 10000)

  it('skill-ipc → registerSkillIpc() 注册 handlers', async () => {
    const { registerSkillIpc } = await import('../skill-ipc')
    registerSkillIpc()
    const channels = handleSpy.mock.calls.map((c: any) => c[0])
    expect(channels).toContain('skill:getAll')
    expect(channels).toContain('skill:export')
    expect(channels.length).toBeGreaterThanOrEqual(4)
  }, 10000)

  it('api-config-ipc → registerApiConfigIpc() 注册 handlers', async () => {
    const { registerApiConfigIpc } = await import('../api-config-ipc')
    registerApiConfigIpc()
    const channels = handleSpy.mock.calls.map((c: any) => c[0])
    expect(channels).toContain('api-config:getAll')
    expect(channels.length).toBeGreaterThanOrEqual(2)
  }, 10000)

})

afterAll(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

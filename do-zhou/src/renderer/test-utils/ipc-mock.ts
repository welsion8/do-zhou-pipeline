/**
 * IPC Mock 层 — 页面组件测试基础设施
 *
 * 模拟 window.electronAPI 的所有服务，让页面组件可以在 jsdom 中渲染测试。
 * 一次投入，所有页面测试复用。
 *
 * 用法:
 *   import { setupIPCMock } from '../../test-utils/ipc-mock'
 *   beforeEach(() => setupIPCMock())
 */

import { vi } from 'vitest'

export function setupIPCMock(overrides: Record<string, any> = {}) {
  const mock = {
    window: {
      minimize: vi.fn(),
      maximize: vi.fn(),
      close: vi.fn(),
      isMaximized: vi.fn(() => Promise.resolve(false)),
    },
    file: {
      read: vi.fn(() => Promise.resolve('')),
      write: vi.fn(() => Promise.resolve()),
      list: vi.fn(() => Promise.resolve([])),
      delete: vi.fn(() => Promise.resolve()),
      rename: vi.fn(() => Promise.resolve()),
      mkdir: vi.fn(() => Promise.resolve()),
      exists: vi.fn(() => Promise.resolve(false)),
    },
    project: {
      create: vi.fn(() => Promise.resolve({ name: 'test', skillName: 's', path: '/t', createdAt: '' })),
      list: vi.fn(() => Promise.resolve([])),
      get: vi.fn(() => Promise.resolve(null)),
      delete: vi.fn(() => Promise.resolve()),
      rename: vi.fn(() => Promise.resolve()),
      listFiles: vi.fn(() => Promise.resolve([])),
    },
    trash: {
      list: vi.fn(() => Promise.resolve([])),
      restore: vi.fn(() => Promise.resolve('')),
      empty: vi.fn(() => Promise.resolve()),
    },
    apiConfig: {
      getAll: vi.fn(() => Promise.resolve([])),
      getKey: vi.fn(() => Promise.resolve('')),
      update: vi.fn(() => Promise.resolve(null)),
      addCustom: vi.fn(() => Promise.resolve({ id: 'c', name: '', apiUrl: '', models: [], enabled: true, order: 0, isBuiltin: false })),
      delete: vi.fn(() => Promise.resolve(false)),
      reorder: vi.fn(() => Promise.resolve()),
      fetchModels: vi.fn(() => Promise.resolve([])),
      testConnection: vi.fn(() => Promise.resolve(false)),
    },
    skill: {
      getAll: vi.fn(() => Promise.resolve([])),
      create: vi.fn(() => Promise.resolve({ id: 's1', name: '', version: '', category: '', stages: [], projectCount: 0, expanded: false, order: 0, createdAt: '' })),
      import: vi.fn(() => Promise.resolve(null)),
      export: vi.fn(() => Promise.resolve('')),
      delete: vi.fn(() => Promise.resolve({ deleted: true, orphanProjects: 0 })),
      rename: vi.fn(() => Promise.resolve()),
      importOverwrite: vi.fn(() => Promise.resolve()),
      importRename: vi.fn(() => Promise.resolve()),
    },
    settings: {
      get: vi.fn(() => Promise.resolve({ editor: { fontSize: 14, lineHeight: 1.7 }, appearance: { theme: 'dark' } })),
      save: vi.fn(() => Promise.resolve({})),
      reset: vi.fn(() => Promise.resolve({})),
    },
    backup: {
      list: vi.fn(() => Promise.resolve([])),
      create: vi.fn(() => Promise.resolve('')),
      restore: vi.fn(() => Promise.resolve('')),
      prune: vi.fn(() => Promise.resolve()),
    },
    engine: {
      chat: vi.fn(() => Promise.resolve({ success: true, messages: [] })),
      chatStream: vi.fn(() => Promise.resolve()),
      loadSession: vi.fn(() => Promise.resolve([])),
      listSessions: vi.fn(() => Promise.resolve([])),
      deleteSession: vi.fn(() => Promise.resolve()),
    },
    tool: {
      readFile: vi.fn(() => Promise.resolve('')),
      writeFile: vi.fn(() => Promise.resolve()),
      glob: vi.fn(() => Promise.resolve([])),
      grep: vi.fn(() => Promise.resolve([])),
    },
    notify: {
      complete: vi.fn(() => Promise.resolve()),
      error: vi.fn(() => Promise.resolve()),
    },
    app: {
      getDataRoot: vi.fn(() => Promise.resolve('/tmp/test-do-zhou')),
    },
    platform: 'win32',
    ...overrides,
  }

  vi.stubGlobal('electronAPI', mock)

  // jsdom polyfills — 补上真实浏览器有但 jsdom 没有的 API
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn()
  }

  return mock
}

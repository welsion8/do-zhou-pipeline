import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { SessionStore } from './session-store'

let tmpDir: string
let store: SessionStore

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-session-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  store = new SessionStore(tmpDir)
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('SessionStore', () => {
  it('空会话 → load 返回 []', () => {
    expect(store.load('new-session')).toEqual([])
  })

  it('append + load → 内容一致', () => {
    const msg = { role: 'user' as const, content: 'hello', timestamp: Date.now() }
    store.append('s1', msg)
    const loaded = store.load('s1')
    expect(loaded).toHaveLength(1)
    expect(loaded[0].content).toBe('hello')
  })

  it('多次 append → 按顺序', () => {
    store.append('s1', { role: 'user' as const, content: 'a', timestamp: 1 })
    store.append('s1', { role: 'assistant' as const, content: 'b', timestamp: 2 })
    const loaded = store.load('s1')
    expect(loaded).toHaveLength(2)
  })

  it('list → 列出所有会话', () => {
    store.append('a', { role: 'user' as const, content: '', timestamp: 0 })
    store.append('b', { role: 'user' as const, content: '', timestamp: 0 })
    expect(store.list()).toHaveLength(2)
  })

  it('delete → 删除后 load 返回空', () => {
    store.append('del-me', { role: 'user' as const, content: '', timestamp: 0 })
    store.delete('del-me')
    expect(store.load('del-me')).toEqual([])
  })
})

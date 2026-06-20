import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ToolExecutor } from './tool-executor'

let tmpDir: string

beforeEach(() => {
  tmpDir = path.join(os.tmpdir(), `do-zhou-test-tool-${Date.now()}`)
  fs.mkdirSync(tmpDir, { recursive: true })
  fs.writeFileSync(path.join(tmpDir, 'test.txt'), 'hello world')
  fs.mkdirSync(path.join(tmpDir, 'subdir'))
})

afterEach(() => {
  if (fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('ToolExecutor', () => {
  it('execute read_file → 读取文件', async () => {
    const exec = new ToolExecutor(tmpDir)
    const result = await exec.execute({ id: '1', type: 'function', function: { name: 'read_file', arguments: JSON.stringify({ filePath: 'test.txt' }) } })
    expect(result.content).toContain('hello world')
  })

  it('execute write_file → 写后读', async () => {
    const exec = new ToolExecutor(tmpDir)
    await exec.execute({ id: '1', type: 'function', function: { name: 'write_file', arguments: JSON.stringify({ filePath: 'new.txt', content: 'new content' }) } })
    expect(fs.existsSync(path.join(tmpDir, 'new.txt'))).toBe(true)
  })

  it('execute list_files → 列出文件', async () => {
    const exec = new ToolExecutor(tmpDir)
    const result = await exec.execute({ id: '1', type: 'function', function: { name: 'list_files', arguments: JSON.stringify({}) } })
    expect(result.content).toContain('test.txt')
  })

  it('execute search_content → 搜索内容', async () => {
    const exec = new ToolExecutor(tmpDir)
    const result = await exec.execute({ id: '1', type: 'function', function: { name: 'search_content', arguments: JSON.stringify({ directory: '.', pattern: 'hello' }) } })
    expect(result.content).toBeDefined()
  })

  it('execute → 未知工具返回错误', async () => {
    const exec = new ToolExecutor(tmpDir)
    const result = await exec.execute({ id: '1', type: 'function', function: { name: 'nonexistent', arguments: '{}' } })
    expect(result.error).toContain('未知工具')
  })
})

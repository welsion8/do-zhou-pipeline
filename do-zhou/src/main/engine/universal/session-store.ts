import * as fs from 'fs'
import * as path from 'path'
import type { Message, SessionRecord } from '../types'

export class SessionStore {
  private basePath: string

  constructor(dataRoot: string) {
    this.basePath = path.join(dataRoot, '.sessions')
    if (!fs.existsSync(this.basePath)) fs.mkdirSync(this.basePath, { recursive: true })
  }

  private filePath(sessionId: string): string {
    return path.join(this.basePath, `${sessionId}.jsonl`)
  }

  /** 读取整个会话的消息列表 */
  load(sessionId: string): Message[] {
    const fp = this.filePath(sessionId)
    if (!fs.existsSync(fp)) return []
    const lines = fs.readFileSync(fp, 'utf-8').split('\n').filter(Boolean)
    return lines.map(l => JSON.parse(l) as Message)
  }

  /** 追加一条消息到会话末尾 */
  append(sessionId: string, message: Message): void {
    const fp = this.filePath(sessionId)
    fs.appendFileSync(fp, JSON.stringify(message) + '\n')
  }

  /** 批量追加消息 */
  appendBatch(sessionId: string, messages: Message[]): void {
    const lines = messages.map(m => JSON.stringify(m)).join('\n') + '\n'
    fs.appendFileSync(this.filePath(sessionId), lines)
  }

  /** 列出所有会话 */
  list(): SessionRecord[] {
    if (!fs.existsSync(this.basePath)) return []
    const files = fs.readdirSync(this.basePath).filter(f => f.endsWith('.jsonl'))
    return files.map(f => {
      const id = f.replace('.jsonl', '')
      const stat = fs.statSync(this.filePath(id))
      const messages = this.load(id)
      return {
        id,
        projectPath: '',
        messages,
        createdAt: stat.birthtimeMs,
        updatedAt: stat.mtimeMs,
      }
    })
  }

  /** 删除会话 */
  delete(sessionId: string): void {
    const fp = this.filePath(sessionId)
    if (fs.existsSync(fp)) fs.unlinkSync(fp)
  }
}

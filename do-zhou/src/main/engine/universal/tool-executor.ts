import * as fs from 'fs'
import * as path from 'path'
import type { ToolCall, ToolDef, ToolResult } from '../types'

export const TOOL_DEFS: ToolDef[] = [
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: '读取项目中的文件内容',
      parameters: {
        type: 'object',
        properties: { filePath: { type: 'string', description: '相对于项目根目录的文件路径' } },
        required: ['filePath'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: '创建或覆写文件',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string', description: '相对于项目根目录的文件路径' },
          content: { type: 'string', description: '写入的文件内容' },
        },
        required: ['filePath', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: '精确替换文件中的指定文本（查找到 old_string 后替换为 new_string）',
      parameters: {
        type: 'object',
        properties: {
          filePath: { type: 'string' },
          oldString: { type: 'string', description: '需要替换的原文本，必须在文件中唯一匹配' },
          newString: { type: 'string', description: '替换后的新文本' },
        },
        required: ['filePath', 'oldString', 'newString'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: '列出目录下的文件和子目录',
      parameters: {
        type: 'object',
        properties: { dirPath: { type: 'string', description: '相对于项目根目录的路径，空字符串表示根' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_content',
      description: '在项目文件中搜索匹配的文本（支持正则）',
      parameters: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: '搜索的文本或正则表达式' },
          filePattern: { type: 'string', description: '可选，限制搜索的文件类型，如 *.tsx' },
        },
        required: ['pattern'],
      },
    },
  },
]

export class ToolExecutor {
  private projectRoot: string

  constructor(projectRoot: string) {
    if (!projectRoot) throw new Error('ToolExecutor: projectRoot 不能为空')
    this.projectRoot = path.resolve(projectRoot)
  }

  private resolve(p: string): string {
    const resolved = path.resolve(this.projectRoot, p)
    // 沙箱：禁止访问项目目录之外的路径
    if (!resolved.startsWith(this.projectRoot)) {
      throw new Error(`禁止访问项目目录外的路径: ${p}`)
    }
    return resolved
  }

  async execute(call: ToolCall): Promise<ToolResult> {
    const { name, arguments: argsStr } = call.function
    let args: Record<string, string>
    try { args = JSON.parse(argsStr) } catch { return { tool_call_id: call.id, content: '', error: '参数 JSON 解析失败' } }

    try {
      switch (name) {
        case 'read_file': {
          const fp = this.resolve(args.filePath || '')
          if (!fs.existsSync(fp)) return { tool_call_id: call.id, content: `文件不存在: ${args.filePath}` }
          const content = fs.readFileSync(fp, 'utf-8')
          return { tool_call_id: call.id, content: content.substring(0, 50000) }
        }
        case 'write_file': {
          const fp = this.resolve(args.filePath || '')
          const dir = path.dirname(fp)
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
          fs.writeFileSync(fp, args.content || '', 'utf-8')
          return { tool_call_id: call.id, content: `文件已写入: ${args.filePath}` }
        }
        case 'edit_file': {
          const fp = this.resolve(args.filePath || '')
          if (!fs.existsSync(fp)) return { tool_call_id: call.id, content: `文件不存在: ${args.filePath}`, error: 'FILE_NOT_FOUND' }
          const original = fs.readFileSync(fp, 'utf-8')
          const oldStr = args.oldString || ''
          const count = original.split(oldStr).length - 1
          if (count === 0) return { tool_call_id: call.id, content: `未找到匹配文本: "${oldStr.substring(0, 60)}"`, error: 'NO_MATCH' }
          if (count > 1) return { tool_call_id: call.id, content: `匹配到 ${count} 处，请提供更精确的匹配文本`, error: 'MULTIPLE_MATCHES' }
          fs.writeFileSync(fp, original.replace(oldStr, args.newString || ''), 'utf-8')
          return { tool_call_id: call.id, content: `文件已编辑: ${args.filePath}` }
        }
        case 'list_files': {
          const dirPath = args.dirPath || ''
          const dp = this.resolve(dirPath)
          if (!fs.existsSync(dp)) return { tool_call_id: call.id, content: `目录不存在: ${dirPath}` }
          const entries = fs.readdirSync(dp, { withFileTypes: true })
            .filter(e => !e.name.startsWith('.') || e.name === '.gitkeep')
            .map(e => `${e.isDirectory() ? '📁' : '📄'} ${e.name}`)
          return { tool_call_id: call.id, content: entries.join('\n') || '(空目录)' }
        }
        case 'search_content': {
          const pattern = args.pattern || ''
          const fileGlob = args.filePattern || '*.md'
          const regex = new RegExp(pattern, 'gi')
          const results: string[] = []
          this.searchDir(this.projectRoot, fileGlob, regex, results, 50)
          return { tool_call_id: call.id, content: results.join('\n') || '未找到匹配内容' }
        }
        default:
          return { tool_call_id: call.id, content: '', error: `未知工具: ${name}` }
      }
    } catch (e) {
      return { tool_call_id: call.id, content: '', error: e instanceof Error ? e.message : String(e) }
    }
  }

  private searchDir(dir: string, glob: string, regex: RegExp, results: string[], limit: number) {
    if (results.length >= limit) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      if (results.length >= limit) return
      if (e.name.startsWith('.') || e.name === 'node_modules') continue
      const fp = path.join(dir, e.name)
      if (e.isDirectory()) { this.searchDir(fp, glob, regex, results, limit) }
      else if (e.name.match(glob.replace('*', '.*'))) {
        const content = fs.readFileSync(fp, 'utf-8')
        const lines = content.split('\n')
        for (let i = 0; i < lines.length; i++) {
          if (regex.test(lines[i])) {
            results.push(`${path.relative(this.projectRoot, fp)}:${i + 1}: ${lines[i].trim().substring(0, 120)}`)
          }
        }
      }
    }
  }
}

/**
 * 章节目录解析器
 * 解析 chapter_index.md → 章节号 + 标题 → 文件映射 N → Chapter-{NN}.md
 */

export interface ChapterEntry {
  number: number        // 章号 (1, 2, 3...)
  title: string         // 章节标题
  fileName: string      // 映射文件名 "Chapter-01.md"
  exists: boolean       // 对应文件是否存在
}

export interface ParseResult {
  entries: ChapterEntry[]
  totalInIndex: number
  totalFiles: number
  consistent: boolean    // 索引数量 vs 文件数量是否一致
}

const CHAPTER_REGEX = /^\*\*第(\d+)章\*\*\s*(.+)$/gm

export function parseChapterIndex(content: string, projectRoot?: string): ParseResult {
  const entries: ChapterEntry[] = []
  let m: RegExpExecArray | null

  // 重置 regex
  CHAPTER_REGEX.lastIndex = 0
  while ((m = CHAPTER_REGEX.exec(content)) !== null) {
    const number = parseInt(m[1])
    const title = m[2].trim()
    const fileName = `Chapter-${String(number).padStart(2, '0')}.md`
    entries.push({ number, title, fileName, exists: true }) // 默认可点击——文件不存在时编辑器会处理
  }

  // 检测文件存在性（简化版——在渲染进程中不直接读磁盘，通过 IPC）
  // 这里先标记为 unknown，由调用方通过 IPC 检测后更新

  return {
    entries,
    totalInIndex: entries.length,
    totalFiles: entries.length, // 由调用方更新
    consistent: true,           // 由调用方更新
  }
}

/**
 * 验证章节一致性：对比 chapter_index.md 中声明的章节数与 chapters/ 目录下实际文件数
 */
export function validateConsistency(indexEntries: ChapterEntry[], actualFiles: string[]): ParseResult {
  const fileSet = new Set(actualFiles.map(f => f.replace(/\\/g, '/').split('/').pop() || ''))

  const entries = indexEntries.map(e => ({
    ...e,
    exists: fileSet.has(e.fileName),
  }))

  const totalFiles = actualFiles.length
  const consistent = entries.length === totalFiles

  return { entries, totalInIndex: entries.length, totalFiles, consistent }
}

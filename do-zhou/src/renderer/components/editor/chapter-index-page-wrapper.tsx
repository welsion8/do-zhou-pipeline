import { useState, useEffect } from 'react'
import { ChapterIndexView } from './chapter-index-view'
import { parseChapterIndex, validateConsistency, type ParseResult } from '../../services/chapter-parser'

interface Props {
  projectPath: string | null
  onChapterClick: (chapterNo: number) => void
  onBack: () => void
  onBackToChapterIndex?: () => void  // [← 目录] 标签链接专用
}

export function ChapterIndexPageWrapper({ projectPath, onChapterClick, onBack, onBackToChapterIndex }: Props): React.ReactElement {
  // 暴露返回章节目录的函数给标签栏 [← 目录] 链接（不清理——切换页面后仍需可用）
  useEffect(() => { (window as any).__chapterBack = onBackToChapterIndex || onBack; }, [onBackToChapterIndex, onBack]);

  const [result, setResult] = useState<ParseResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!projectPath) { setLoading(false); setError('未打开项目'); return }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const api = window.electronAPI
        if (!api) { setError('API 不可用'); setLoading(false); return }

        // 读取章节目录文件（兼容两种命名：chapter-index.md 和 chapter_index.md）
        let content: string | null = null
        let resolvedFileName = 'chapter-index.md'

        // 先尝试连字符版本
        content = await api.file.read(`${projectPath}/chapter-index.md`)

        // 如果不存在，尝试下划线版本（旧项目兼容）
        if (content === null || content === undefined) {
          content = await api.file.read(`${projectPath}/chapter_index.md`)
          if (content !== null && content !== undefined) {
            resolvedFileName = 'chapter_index.md'
          }
        }

        if (content === null || content === undefined) {
          // Spec §5: chapter_index.md 不存在
          setError('chapter-index.md 不存在')
          setLoading(false)
          return
        }

        if (content.trim().length === 0) {
          // Spec §5: chapter_index.md 存在但为空
          setError('chapter-index.md 为空')
          setLoading(false)
          return
        }

        // 解析章节索引
        const parsed = parseChapterIndex(content)

        if (parsed.entries.length === 0) {
          // Spec §5: 格式错误
          setError('章节目录格式异常，请检查 chapter-index.md 格式。预期格式：**第N章** 标题名称')
          setLoading(false)
          return
        }

        // 读取 chapters/ 目录文件列表进行一致性校验
        try {
          const chapterFiles = await api.file.list(`${projectPath}/chapters`)
          const fileNames = (chapterFiles || []).map((f: { name: string }) => f.name)
          const validated = validateConsistency(parsed.entries, fileNames)
          setResult(validated)
        } catch {
          // chapters/ 目录不存在或无法读取
          setResult({ ...parsed, totalFiles: 0, consistent: parsed.entries.length === 0 })
        }

        setLoading(false)
      } catch (_) {
        setError('读取章节目录失败')
        setLoading(false)
      }
    }

    load()
  }, [projectPath])

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-bg-panel">
        <div className="shrink-0 flex items-center px-[32px] py-[16px] border-b border-border-default">
          <h2 className="text-text-primary text-[15px] font-ui font-semibold">📋 章节目录</h2>
          <button className="ml-auto px-[10px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px]" onClick={onBack}>← 返回工作台</button>
        </div>
        <div className="flex-1 flex items-center justify-center text-text-tertiary text-[12px]">加载中...</div>
      </div>
    )
  }

  if (error) {
    const isFormatError = error.includes('格式异常')
    const isNotFound = error.includes('不存在')
    const isEmpty = error.includes('为空')

    return (
      <div className="flex flex-col h-full bg-bg-panel">
        <div className="shrink-0 flex items-center px-[32px] py-[16px] border-b border-border-default">
          <h2 className="text-text-primary text-[15px] font-ui font-semibold">📋 章节目录</h2>
          <button className="ml-auto px-[10px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px]" onClick={onBack}>← 返回工作台</button>
        </div>
        {isFormatError && (
          <div className="shrink-0 mx-[16px] mt-[12px] px-[16px] py-[10px] rounded-md bg-[#2A2520] border border-[#F0A060]">
            <span className="text-[#F0A060] text-[12px] font-ui">⚠ {error}</span>
          </div>
        )}
        <div className="flex-1 flex flex-col items-center justify-center gap-[12px] text-text-tertiary">
          <span className="text-[36px]">{isNotFound ? '📄' : isEmpty ? '📝' : '⚠'}</span>
          <p className="text-[13px]">
            {isNotFound ? '尚未创建章节目录。请在文件树中新建 chapter-index.md，或在 AI 对话区输入指令生成章节目录' :
             isEmpty ? '章节目录为空。请编辑 chapter-index.md 添加章节，或使用 AI 生成' :
             error}
          </p>
          {(isNotFound || isEmpty) && (
            <div className="flex gap-[8px] mt-[4px]">
              {isNotFound && (
                <button className="px-[12px] py-[5px] rounded-sm bg-accent-dim/20 border border-accent-dim text-accent text-[12px] hover:bg-accent-dim/30"
                  onClick={async () => {
                    const api = window.electronAPI
                    if (!api || !projectPath) return
                    // 发送 AI 生成章节目录的指令
                    try {
                      const dataRoot = await api.app.getDataRoot()
                      const fullRoot = dataRoot ? dataRoot.replace(/\\/g, '/') + '/' + (projectPath || '') : (projectPath || '')
                      api.engine.chat({
                        systemPrompt: '你是 Do 舟的 AI 写作助手。',
                        userMessage: '请根据故事大纲生成章节目录，写入 chapter-index.md 文件。格式要求：每行以 **第N章** 开头，后跟章节标题。',
                        maxTokens: 4096, mode: 'once', projectRoot: fullRoot,
                      }).then((r: any) => { if (r?.error) console.error('AI 错误:', r.error) }).catch(() => {})
                    } catch (_) {}
                  }}
                  data-testid="btn-new-chapter"
                >✨ AI 生成章节目录</button>
              )}
              <button className="px-[12px] py-[5px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover"
                onClick={() => {
                  // 手动编辑：在文件树中打开 chapter-index.md
                  if (projectPath) {
                    const api = window.electronAPI
                    api?.file?.read(`${projectPath}/chapter-index.md`).then((c: string | null) => {
                      // 触发文件打开操作——通过全局 editorAPI
                      const editorApi = (window as unknown as Record<string, unknown>).__editorAPI as { openFile?: (fp: string) => void } | undefined
                      editorApi?.openFile?.(`${projectPath}/chapter-index.md`)
                    }).catch(() => {})
                  }
                  onBack()
                }}
              >📝 手动编辑</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <ChapterIndexView
      result={result!}
      onChapterClick={onChapterClick}
      onBack={onBack}
    />
  )
}

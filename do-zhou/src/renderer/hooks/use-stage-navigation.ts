import { useState, useCallback, useEffect } from 'react'
import { parseChapterIndex } from '../services/chapter-parser'

export type StageState = '⏹' | '⟳' | '✅'
export type StageId = 'outline' | 'character' | 'chapter_index' | 'chapter_writing'

export interface StageDef {
  id: StageId
  label: string
  icon: string           // ① ② ③ ④
  bindFile: string       // 绑定的文件路径
  state: StageState
}

const STAGE_DEFS: Omit<StageDef, 'state'>[] = [
  { id: 'outline', label: '故事大纲', icon: '①', bindFile: 'outline.md' },
  { id: 'character', label: '人物小传', icon: '②', bindFile: 'character.md' },
  { id: 'chapter_index', label: '章节目录', icon: '③', bindFile: 'chapter-index.md' },
  { id: 'chapter_writing', label: '章节写作', icon: '④', bindFile: 'chapters/' },
]

export interface StageNavAPI {
  stages: StageDef[]
  activeStage: StageId | null
  expandedStage: StageId | null
  chapters: string[]          // 阶段④展开时解析的章节列表
  setActiveStage: (id: StageId | null) => void
  setExpandedStage: (id: StageId | null) => void
  handleStageClick: (id: StageId) => void
  handleChapterJump: (chapterNo: number) => void
  refreshChapterList: (chapterIndexContent: string) => void
}

interface Props {
  onOpenFile?: (filePath: string, triggerAI?: boolean) => void
  onChapterJump?: (chapterNo: number) => void
  chapterIndexContent?: string | null   // chapter-index.md 内容，用于阶段④展开
  projectPath?: string | null           // 项目路径，用于阶段状态检查
}

export function useStageNavigation({ onOpenFile, onChapterJump, chapterIndexContent, projectPath }: Props): StageNavAPI {
  const [stages, setStages] = useState<StageDef[]>(STAGE_DEFS.map(s => ({ ...s, state: '⏹' })))
  const [activeStage, setActiveStage] = useState<StageId | null>(null)
  const [expandedStage, setExpandedStage] = useState<StageId | null>(null)
  const [chapters, setChapters] = useState<string[]>([])

  // 使用 Phase 9 的统一解析器
  const refreshChapterList = useCallback((content: string) => {
    const parsed = parseChapterIndex(content)
    setChapters(parsed.entries.map(e => `第${e.number}章 · ${e.title}`))
  }, [])

  useEffect(() => {
    if (chapterIndexContent) refreshChapterList(chapterIndexContent)
  }, [chapterIndexContent, refreshChapterList])

  // 阶段状态自动判定：读取绑定文件内容（使用 project-relative 路径）
  useEffect(() => {
    const checkFiles = async () => {
      if (!projectPath || !window.electronAPI?.file) return
      const updated = await Promise.all(STAGE_DEFS.map(async (s) => {
        try {
          // 阶段④检查 chapters/ 目录非空
          if (s.id === 'chapter_writing') {
            const files = await window.electronAPI.file.list(`${projectPath}/chapters`)
            const hasMd = files?.some((f: { name: string }) => f.name.endsWith('.md'))
            return { ...s, state: (hasMd ? '✅' : '⏹') as StageState }
          }
          // 其他阶段检查文件内容非空
          let content = await window.electronAPI.file.read(`${projectPath}/${s.bindFile}`)
          // ③章节目录：兼容旧项目用的 chapter_index.md（下划线）命名
          if ((content === null || content === undefined) && s.id === 'chapter_index') {
            content = await window.electronAPI.file.read(`${projectPath}/chapter_index.md`)
          }
          if (content && content.trim().length > 0) return { ...s, state: '✅' as StageState }
        } catch (_) {}
        return { ...s, state: '⏹' as StageState }
      }))
      setStages(updated)
    }
    if (projectPath) checkFiles()
  }, [projectPath])

  // 阶段点击行为
  const handleStageClick = useCallback((id: StageId) => {
    const stage = stages.find(s => s.id === id)
    if (!stage) return

    // 并发冲突策略: AI 生成中 → 同一卡片忽略点击，其他卡片也忽略点击
    if (stage.state === '⟳') {
      console.log('⏳ AI 正在生成中，忽略点击')
      return
    }

    setActiveStage(id)

    // 阶段④特殊处理：展开/收起章节列表
    if (id === 'chapter_writing') {
      setExpandedStage(expandedStage === id ? null : id)
      // 如果已完成，仅加载不触发 AI
      if (stage.state === '✅') return
      // 如果是未开始或进行中，触发 AI
      onOpenFile?.(stage.bindFile, stage.state !== '✅')
      return
    }

    // 其他阶段：✅ → 仅加载文件 / ⏹⟳ → 加载+触发 AI
    const triggerAI = stage.state !== '✅'
    onOpenFile?.(stage.bindFile, triggerAI)
  }, [stages, expandedStage, onOpenFile])

  const handleChapterJump = useCallback((chapterNo: number) => {
    onChapterJump?.(chapterNo)
  }, [onChapterJump])

  // 根据文件写入结果更新阶段状态
  const updateStageState = useCallback((id: StageId, state: StageState) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, state } : s))
  }, [])

  return {
    stages, activeStage, expandedStage, chapters,
    setActiveStage, setExpandedStage,
    handleStageClick, handleChapterJump, refreshChapterList,
  }
}

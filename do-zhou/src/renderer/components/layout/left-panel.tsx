import { useState, useEffect, useCallback } from 'react'
import { FileTree } from '../file-tree/file-tree'
import { StageCards } from '../navigation/stage-cards'
import { ProjectContextMenu } from '../navigation/project-context-menu'
import { useStageNavigation } from '../../hooks/use-stage-navigation'

type Entry = { name: string; isDirectory: boolean }

export function LeftPanel({ width, activeProject, projectPath, onOpenFile, onChapterIndexClick }: {
  width: number; activeProject?: string | null; projectPath?: string | null
  onOpenFile?: (filePath: string) => void
  onChapterIndexClick?: () => void
}): React.ReactElement {
  const [files, setFiles] = useState<Entry[]>([])
  const [loading, setLoading] = useState(false)
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)

  // 内联重命名（替代 prompt）
  const [renaming, setRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')

  // 自定义确认弹窗（替代 confirm）
  const [confirmMsg, setConfirmMsg] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null)

  // Phase 8: 阶段导航 — 接入实际交互
  const [chapterIndexContent, setChapterIndexContent] = useState<string | null>(null)
  useEffect(() => {
    if (!projectPath) return
    const loadChapterIndex = async () => {
      const api = window.electronAPI
      if (!api) return
      let content = await api.file.read(`${projectPath}/chapter-index.md`)
      if (!content) content = await api.file.read(`${projectPath}/chapter_index.md`) // 兼容旧命名
      if (content) setChapterIndexContent(content)
    }
    loadChapterIndex()
  }, [projectPath])

  const stageNav = useStageNavigation({
    projectPath,
    chapterIndexContent,
    onOpenFile: (filePath: string, triggerAI?: boolean) => {
      // 阶段③章节目录：切换为竖列视图（兼容两种命名）
      if (filePath === 'chapter-index.md' || filePath === 'chapter_index.md') {
        onChapterIndexClick?.()
        return
      }
      // 阶段④章节写作：不打开单个文件，展开章节列表（由 StageCardItem 处理）
      if (filePath === 'chapters/') return

      // 其他阶段：打开文件到编辑器
      const fullPath = projectPath ? `${projectPath}/${filePath}` : filePath
      onOpenFile?.(fullPath)
      if (triggerAI) {
        window.electronAPI?.app?.getDataRoot?.().then((dataRoot: string) => {
          const fullRoot = dataRoot ? dataRoot.replace(/\\/g, '/') + '/' + (projectPath || '') : (projectPath || '')
          const presetPrompt = '请根据创作流程，生成 ' + filePath + ' 的内容。'
          window.electronAPI?.engine?.chat?.({ systemPrompt: '你是 Do 舟的 AI 写作助手。', userMessage: presetPrompt, maxTokens: 4096, mode: 'once', projectRoot: fullRoot })
            .then((r: any) => { if (r?.error) console.error('AI 错误:', r.error) })
            .catch(() => {})
        }).catch(() => {})
      }
    },
    onChapterJump: (chapterNo: number) => {
      const fileName = `Chapter-${String(chapterNo).padStart(2, '0')}.md`
      const fullPath = projectPath ? `${projectPath}/chapters/${fileName}` : `chapters/${fileName}`
      onOpenFile?.(fullPath)
      console.log('📖 打开章节:', fileName)
    },
  })

  const load = useCallback(async () => {
    if (!activeProject || !window.electronAPI?.project) return
    setLoading(true)
    try { setFiles(await window.electronAPI.project.listFiles(activeProject)) } catch { setFiles([]) }
    setLoading(false)
  }, [activeProject])

  useEffect(() => { load() }, [load])

  // 项目右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleRenameStart = useCallback(() => {
    setRenaming(true)
    setRenameValue(activeProject || '')
    setCtxMenu(null)
  }, [activeProject])

  const handleRenameConfirm = useCallback(async () => {
    if (!activeProject || !window.electronAPI?.project || !renameValue || renameValue === activeProject) {
      setRenaming(false); return
    }
    try { await window.electronAPI.project.rename(activeProject, renameValue); load() } catch (_) { /* ignore */ }
    setRenaming(false)
  }, [activeProject, renameValue, load])

  // 移入回收站
  const handleMoveToTrash = useCallback(() => {
    setCtxMenu(null)
    if (!activeProject || !window.electronAPI?.project) return
    setConfirmMsg('确定将 "' + activeProject + '" 移入回收站？')
    setConfirmAction(function() { return function() { window.electronAPI?.project?.delete?.(activeProject).then(function() { load() }).catch(function() {}) } })
  }, [activeProject, load])

  // 彻底删除
  const handleDeletePermanently = useCallback(() => {
    setCtxMenu(null)
    if (!activeProject || !window.electronAPI?.project) return
    setConfirmMsg('⚠ 彻底删除 "' + activeProject + '"？此操作不可恢复。')
    setConfirmAction(function() { return function() { window.electronAPI?.project?.delete?.(activeProject).then(function() { window.electronAPI?.trash?.empty?.(); load() }).catch(function() {}) } })
  }, [activeProject, load])

  // 置顶
  const handlePinToTop = useCallback(() => {
    setCtxMenu(null)
    console.log('📌 置顶:', activeProject)
  }, [activeProject])

  const doConfirm = useCallback(() => {
    if (confirmAction) { var result = confirmAction(); if (typeof result === 'function') result() }
    setConfirmMsg(null); setConfirmAction(null)
  }, [confirmAction])

  return (
    <aside className="h-full bg-bg-panel border-r border-border-default flex flex-col overflow-hidden shrink-0" style={{ width }}>
      {/* 内联重命名栏 */}
      {renaming && (
        <div className="flex items-center gap-[8px] px-[16px] py-[8px] border-b border-border-default bg-bg-active shrink-0">
          <input
            className="flex-1 px-[10px] py-[4px] rounded-sm bg-bg-base border border-border-default text-text-primary text-[12px] font-ui outline-none focus:border-accent-dim"
            value={renameValue}
            onChange={e => setRenameValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(); if (e.key === 'Escape') setRenaming(false) }}
            autoFocus
          />
          <button className="px-[8px] py-[3px] rounded-sm bg-accent-dim/20 text-accent text-[11px] hover:bg-accent-dim/30" onClick={handleRenameConfirm}>确认</button>
          <button className="px-[8px] py-[3px] rounded-sm bg-transparent text-text-tertiary text-[11px] hover:bg-bg-hover" onClick={() => setRenaming(false)}>取消</button>
        </div>
      )}

      {/* Phase 8: 阶段流程卡片 */}
      <div className="flex-shrink-0 overflow-y-auto p-[16px] pb-[8px]">
        <StageCards api={stageNav} />
      </div>

      {/* 分隔线 */}
      <div className="h-[3px] bg-accent-dim mx-[16px] my-[8px] shrink-0" />

      {/* 文件树 */}
      <div className="flex-1 overflow-y-auto pb-[16px]" onContextMenu={handleContextMenu}>
        {activeProject
          ? <FileTree entries={files} projectPath={projectPath ?? undefined} loading={loading} onFileClick={(n) => onOpenFile?.(n)} onRefresh={load} />
          : <p className="text-text-tertiary text-[11px] px-[16px]">暂无项目</p>}
      </div>

      {/* 项目右键菜单 */}
      {ctxMenu && activeProject && (
        <ProjectContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          projectName={activeProject}
          onClose={() => setCtxMenu(null)}
          onOpen={() => { console.log('打开项目:', activeProject); setCtxMenu(null) }}
          onRename={handleRenameStart}
          onMoveToTrash={handleMoveToTrash}
          onDeletePermanently={handleDeletePermanently}
          onPinToTop={handlePinToTop}
        />
      )}

      {/* 自定义确认弹窗 */}
      {confirmMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => { setConfirmMsg(null); setConfirmAction(null) }} data-testid="modal-overlay">
          <div className="bg-bg-panel border border-border-default rounded-md p-[24px] max-w-[440px] shadow-xl" onClick={e => e.stopPropagation()} data-testid="modal-body">
            <p className="text-text-primary text-[13px] font-ui mb-[16px]" data-testid="modal-title">{confirmMsg}</p>
            <div className="flex gap-[8px] justify-end">
              <button className="px-[12px] py-[5px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" onClick={() => { setConfirmMsg(null); setConfirmAction(null) }} data-testid="modal-cancel">取消</button>
              <button className="px-[12px] py-[5px] rounded-sm bg-[#E57373]/20 border border-[#E57373]/30 text-[#E57373] text-[12px] hover:bg-[#E57373]/30" onClick={doConfirm} data-testid="modal-confirm">确认</button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

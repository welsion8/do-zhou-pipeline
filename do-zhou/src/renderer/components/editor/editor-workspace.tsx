import { useState, useCallback, useEffect } from 'react'
import { MarkdownEditor } from './markdown-editor'
import { MarkdownPreview } from './markdown-preview'
import { TabBar } from './tab-bar'
import { EditorToolbar } from './editor-toolbar'
import { EditorContextMenu } from './editor-context-menu'
import { TabContextMenu } from './tab-context-menu'
import { useOpenTabs, type Tab } from '../../hooks/use-open-tabs'
import { useAutosave } from '../../hooks/use-autosave'

export function EditorWorkspace({ onTabContextMenu, openTabs, activeTab: externalActiveTab }: {
  onTabContextMenu?: (tabId: string, x: number, y: number, tabs: Tab[]) => void
  openTabs?: string[]; activeTab?: string | null; onSelectTab?: (fp: string) => void; onCloseTab?: (fp: string) => void
}): React.ReactElement {
  const {
    tabs, activeTabId,
    openTab, closeTab, closeOtherTabs, closeAllTabs,
    setActiveTab, renameTab, markDirty, reorderTabs, getTabByPath,
  } = useOpenTabs()

  const [mode, setMode] = useState<'edit' | 'preview'>('edit')
  const [editorContent, setEditorContent] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 })
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number } | null>(null)
  const [tabCtxMenu, setTabCtxMenu] = useState<{ tabId: string; x: number; y: number } | null>(null)
  const [aiLocked, setAiLocked] = useState(false)

  // 同步外部 openTabs 到内部标签系统
  useEffect(() => {
    if (openTabs) {
      for (const fp of openTabs) {
        if (!tabs.find(t => t.filePath === fp)) openTab(fp)
      }
    }
  }, [openTabs?.length])

  // 同步外部 activeTab（强制刷新文件内容）
  useEffect(() => {
    if (!externalActiveTab) return
    const tab = tabs.find(t => t.filePath === externalActiveTab)
    if (tab) {
      // 已存在的标签 — 切换时强制重新加载文件内容
      window.electronAPI?.file?.read(tab.filePath).then((c: string | null) => {
        if (c !== null && c !== undefined) setEditorContent(c)
      }).catch(() => {})
      setActiveTab(tab.id)
    } else {
      openTab(externalActiveTab)
    }
  }, [externalActiveTab])

  const activeTab = tabs.find(t => t.id === activeTabId) ?? null

  const doSave = useCallback(() => {
    if (!activeTab || !isDirty) return
    const api = window.electronAPI
    if (!api) return
    api.file.write(activeTab.filePath, editorContent)
    markDirty(activeTab.id, false)
    setIsDirty(false)
  }, [activeTab, editorContent, isDirty, markDirty])

  useAutosave({ intervalMs: 2000, enabled: true, dirty: isDirty, onSave: doSave })

  // 激活 tab 时自动加载文件内容
  useEffect(() => {
    if (!activeTab || activeTab.content !== undefined) return
    window.electronAPI?.file?.read(activeTab.filePath).then(function(c: string | null) {
      if (c !== null && c !== undefined) { setEditorContent(c); markDirty(activeTab.id, false) }
    }).catch(function() {})
  }, [activeTab?.id])

  // 编辑器快捷键
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 's') { e.preventDefault(); doSave() }
        else if (e.key === 'w') { e.preventDefault(); if (activeTab) closeTab(activeTab.id) }
        else if (e.key === 'Tab') { e.preventDefault(); e.shiftKey ? prevTab() : nextTab() }
        else if (e.key === 'f') { e.preventDefault(); /* find */ }
        else if (e.key === 'h') { e.preventDefault(); /* replace */ }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeTab, doSave, closeTab])

  const nextTab = useCallback(() => { const i = tabs.findIndex(t => t.id === activeTabId); if (i < tabs.length - 1) setActiveTab(tabs[i + 1].id) }, [tabs, activeTabId])
  const prevTab = useCallback(() => { const i = tabs.findIndex(t => t.id === activeTabId); if (i > 0) setActiveTab(tabs[i - 1].id) }, [tabs, activeTabId])

  const handleFileOpen = useCallback(async (filePath: string, title?: string) => {
    const api = window.electronAPI
    if (!api) return
    try {
      const content = await api.file.read(filePath)
      setEditorContent(content)
      openTab(filePath, title)
      setMode('edit')
      setIsDirty(false)
    } catch (_) {
      setEditorContent('')
      openTab(filePath, title)
      setMode('edit')
      setIsDirty(false)
    }
  }, [openTab])

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__editorAPI = {
      openFile: handleFileOpen,
      activeFilePath: activeTab?.filePath ?? null,
    }
  }, [handleFileOpen, activeTab])

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__editorCursor = cursorPos
  }, [cursorPos])

  const handleSelectTab = useCallback(async (tabId: string) => {
    if (activeTab && isDirty) doSave()
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    const api = window.electronAPI
    if (!api) { setActiveTab(tabId); return }
    try { setEditorContent(await api.file.read(tab.filePath)) } catch (_) { setEditorContent('') }
    setActiveTab(tabId)
    setIsDirty(false)
    setMode('edit')
  }, [activeTab, isDirty, doSave, tabs, setActiveTab])

  const handleCloseTab = useCallback((tabId: string) => {
    if (activeTab?.id === tabId && isDirty) doSave()
    closeTab(tabId)
  }, [activeTab, isDirty, doSave, closeTab])

  const handleNewFile = useCallback(async () => {
    const api = window.electronAPI
    if (!api) return
    const baseName = '未命名'
    let name = `${baseName}.md`
    let counter = 1
    while (await api.file.exists(name)) { name = `${baseName}-${counter}.md`; counter++ }
    await api.file.write(name, '')
    setEditorContent(''); openTab(name); setMode('edit'); setIsDirty(false)
  }, [openTab])

  const handleEditorContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY })
  }, [])

  return (
    <div className="flex flex-col h-full bg-bg-editor">
      <TabBar
        tabs={tabs} activeTabId={activeTabId}
        onSelectTab={handleSelectTab} onCloseTab={handleCloseTab}
        onRenameTab={renameTab} onReorderTabs={reorderTabs}
        onContextMenu={(tabId, x, y) => setTabCtxMenu({ tabId, x, y })}
      />
      <EditorToolbar mode={mode} onToggleMode={() => setMode(m => m === 'edit' ? 'preview' : 'edit')} onNewFile={handleNewFile} />
      <div className="flex-1 flex flex-col min-h-0" onContextMenu={handleEditorContextMenu} data-testid="editor-content">
        {activeTab ? (
          mode === 'preview' ? (
            <MarkdownPreview content={editorContent} />
          ) : (
            <MarkdownEditor
              value={editorContent}
              onChange={v => { setEditorContent(v); setIsDirty(true) }}
              readOnly={aiLocked}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
            />
          )
        ) : (
          <div className="flex items-center justify-center flex-1 min-h-0 text-text-tertiary text-[13px] select-none">
            <p>打开文件开始编辑，或点击 [+ 新建] 创建新文件</p>
          </div>
        )}
      </div>

      {aiLocked && (
        <div className="flex items-center gap-[8px] px-[16px] py-[8px] bg-[#2A2520] border-t border-[#F0A060] shrink-0">
          <span className="text-[#F0A060] text-[12px] font-ui">🤖 AI 正在写入，编辑器已锁定（只读）</span>
          <button
            className="ml-auto px-[10px] py-[3px] rounded-sm bg-transparent border border-[#F0A060] text-[#F0A060] text-[11px] hover:bg-[#3D3028] transition-colors"
            onClick={() => setAiLocked(false)}
          >
            ✏️ 手动接管
          </button>
        </div>
      )}

      {ctxMenu && (
        <EditorContextMenu
          x={ctxMenu.x} y={ctxMenu.y}
          onClose={() => setCtxMenu(null)}
          onCopy={() => { navigator.clipboard.writeText(editorContent.slice(0, 5000)); setCtxMenu(null) }}
          onCut={() => { navigator.clipboard.writeText(editorContent.slice(0, 5000)); setCtxMenu(null) }}
          onPaste={() => setCtxMenu(null)}
          onAiRewrite={() => setCtxMenu(null)}
          onAiPolish={() => setCtxMenu(null)}
          onAiExpand={() => setCtxMenu(null)}
        />
      )}

      {tabCtxMenu && (() => {
        const tab = tabs.find(t => t.id === tabCtxMenu.tabId)
        if (!tab) return null
        return (
          <TabContextMenu
            x={tabCtxMenu.x} y={tabCtxMenu.y}
            tabTitle={tab.title}
            filePath={tab.filePath}
            onClose={() => setTabCtxMenu(null)}
            onCloseTab={() => handleCloseTab(tab.id)}
            onCloseOthers={() => closeOtherTabs(tab.id)}
            onCloseAll={closeAllTabs}
          />
        )
      })()}
    </div>
  )
}

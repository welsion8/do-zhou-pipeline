import { useState, useRef, useCallback } from 'react'
import type { Tab } from '../../hooks/use-open-tabs'

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string | null
  onSelectTab: (tabId: string) => void
  onCloseTab: (tabId: string) => void
  onRenameTab: (tabId: string, name: string) => void
  onReorderTabs: (from: number, to: number) => void
  onContextMenu: (tabId: string, x: number, y: number) => void
}

export function TabBar({
  tabs, activeTabId, onSelectTab, onCloseTab, onRenameTab, onReorderTabs, onContextMenu,
}: TabBarProps): React.ReactElement {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const startRename = useCallback((tab: Tab) => {
    setEditingTabId(tab.id)
    setEditValue(tab.title)
  }, [])

  const commitRename = useCallback((tabId: string) => {
    if (editValue.trim()) {
      onRenameTab(tabId, editValue.trim())
    }
    setEditingTabId(null)
  }, [editValue, onRenameTab])

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return
    onReorderTabs(dragIndex, index)
    setDragIndex(index)
  }, [dragIndex, onReorderTabs])

  const handleDragEnd = useCallback(() => {
    if (dragIndex !== null) { const to = tabs.findIndex(t => t.id === activeTabId); if (to >= 0 && dragIndex !== to) onReorderTabs(dragIndex, to) }
    setDragIndex(null)
  }, [dragIndex, activeTabId, tabs, onReorderTabs])

  return (
    <div className="flex flex-col shrink-0">
      <div ref={scrollRef} className="flex items-end h-[36px] bg-bg-panel border-b border-border-default overflow-x-auto overflow-y-hidden
        [&::-webkit-scrollbar]:h-[3px] [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border-default [&::-webkit-scrollbar-thumb]:rounded-none"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTabId
          return (
            <div
              key={tab.id}
              className={`group flex items-center gap-[8px] px-[14px] py-[8px] text-[12px] cursor-pointer select-none shrink-0 min-w-[80px] max-w-[200px] transition-colors duration-75
                ${isActive
                  ? 'bg-bg-editor text-text-primary'
                  : 'bg-transparent text-text-tertiary border-r border-border-default hover:text-text-secondary'
                }`}
              onClick={() => onSelectTab(tab.id)}
              onDoubleClick={() => startRename(tab)}
              onContextMenu={e => { e.preventDefault(); onContextMenu(tab.id, e.clientX, e.clientY) }}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              data-testid="tab"
            >
              {/Chapter-\d+/.test(tab.title) && (
                <span className="text-[10px] text-accent cursor-pointer hover:underline mr-[4px]"
                  onClick={e => { e.stopPropagation(); (window as any).__chapterBack?.(); }}>
                  [← 目录]
                </span>
              )}
              {editingTabId === tab.id ? (
                <input
                  className="bg-bg-active border border-border-hover rounded-sm px-[4px] py-[1px] text-[12px] text-text-primary outline-none w-[80px]"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={() => commitRename(tab.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename(tab.id)
                    if (e.key === 'Escape') setEditingTabId(null)
                  }}
                  onClick={e => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <>
                  <span className="truncate max-w-[140px]">{tab.title}</span>
                  {tab.isDirty && <span className="w-[6px] h-[6px] rounded-full bg-accent shrink-0" />}
                  <button
                    className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-text-primary text-[14px] leading-none shrink-0"
                    onClick={e => { e.stopPropagation(); onCloseTab(tab.id) }}
                    data-testid="tab-close"
                    aria-label={`关闭 ${displayName}`}
                  >
                    ×
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
      {/* 标签栏底部 3px 滚动条拖拽滑块 */}
      <div className="h-[3px] bg-border-default shrink-0">
        {tabs.length > 3 && (
          <div
            className="h-full bg-accent-dim cursor-ew-resize transition-colors"
            style={{ width: `${Math.max(20, 100 / tabs.length)}%` }}
          />
        )}
      </div>
    </div>
  )
}

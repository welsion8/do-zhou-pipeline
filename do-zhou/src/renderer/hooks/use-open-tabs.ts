import { useState, useCallback } from 'react'

export interface Tab {
  id: string
  filePath: string
  title: string
  isDirty: boolean
  content?: string
}

interface UseOpenTabsReturn {
  tabs: Tab[]
  activeTabId: string | null
  openTab: (filePath: string, title?: string) => void
  closeTab: (tabId: string) => void
  closeOtherTabs: (tabId: string) => void
  closeAllTabs: () => void
  setActiveTab: (tabId: string) => void
  renameTab: (tabId: string, newTitle: string) => void
  markDirty: (tabId: string, dirty: boolean) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  getTabByPath: (filePath: string) => Tab | undefined
}

let tabCounter = 0

export function useOpenTabs(): UseOpenTabsReturn {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [activeTabId, setActiveTabId] = useState<string | null>(null)

  const openTab = useCallback((filePath: string, title?: string) => {
    setTabs(prev => {
      const existing = prev.find(t => t.filePath === filePath)
      if (existing) {
        setActiveTabId(existing.id)
        return prev
      }
      const id = `tab-${++tabCounter}`
      const newTab: Tab = {
        id,
        filePath,
        title: title || filePath.split('/').pop() || filePath,
        isDirty: false,
      }
      setActiveTabId(id)
      // 异步加载文件内容
      window.electronAPI?.file?.read(filePath).then((content: string | null) => {
        if (content !== null && content !== undefined) {
          setTabs(prev => prev.map(t => t.id === id ? { ...t, content } : t))
        }
      }).catch(() => {})
      return [...prev, newTab]
    })
  }, [])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const idx = prev.findIndex(t => t.id === tabId)
      const next = prev.filter(t => t.id !== tabId)
      if (tabId === activeTabId && next.length > 0) {
        const newIdx = Math.min(idx, next.length - 1)
        setActiveTabId(next[newIdx].id)
      } else if (next.length === 0) {
        setActiveTabId(null)
      }
      return next
    })
  }, [activeTabId])

  const closeOtherTabs = useCallback((tabId: string) => {
    setTabs(prev => prev.filter(t => t.id === tabId))
    setActiveTabId(tabId)
  }, [])

  const closeAllTabs = useCallback(() => {
    setTabs([])
    setActiveTabId(null)
  }, [])

  const setActiveTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const renameTab = useCallback((tabId: string, newTitle: string) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, title: newTitle } : t))
  }, [])

  const markDirty = useCallback((tabId: string, dirty: boolean) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, isDirty: dirty } : t))
  }, [])

  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
  }, [])

  const getTabByPath = useCallback((filePath: string) => {
    return tabs.find(t => t.filePath === filePath)
  }, [tabs])

  return {
    tabs, activeTabId,
    openTab, closeTab, closeOtherTabs, closeAllTabs,
    setActiveTab, renameTab, markDirty, reorderTabs, getTabByPath,
  }
}

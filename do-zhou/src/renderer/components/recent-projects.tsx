/**
 * RecentProjects — 最近打开的项目列表
 *
 * 显示最近 5 个打开的项目，按时间倒序。
 * 数据持久化到本地 JSON。支持移除单条。
 */
import { useState, useEffect } from 'react'

interface RecentProject {
  name: string
  skillName: string
  path: string
  lastOpenedAt: number
}

interface Props {
  onOpenProject: (projectPath: string) => void
}

export function RecentProjects({ onOpenProject }: Props): React.ReactElement | null {
  const [recent, setRecent] = useState<RecentProject[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadRecent()
  }, [])

  function loadRecent() {
    try {
      const stored = localStorage.getItem('do-zhou-recent-projects')
      if (stored) {
        const items: RecentProject[] = JSON.parse(stored)
        // 过滤已过时的条目
        setRecent(items.slice(0, 5))
      }
    } catch (_) {}
    setLoaded(true)
  }

  function removeRecent(name: string, e: React.MouseEvent) {
    e.stopPropagation()
    const updated = recent.filter(r => r.name !== name)
    setRecent(updated)
    localStorage.setItem('do-zhou-recent-projects', JSON.stringify(updated))
  }

  if (!loaded || recent.length === 0) return null

  return (
    <div className="mb-[12px]" data-testid="recent-projects">
      <div className="text-text-tertiary text-[11px] font-ui font-semibold px-[16px] mb-[6px]">
        🕐 最近打开
      </div>
      {recent.map(r => (
        <div
          key={r.name}
          className="group flex items-center gap-[8px] px-[16px] py-[6px] rounded-sm cursor-pointer hover:bg-bg-active transition-colors text-text-secondary text-[12px]"
          onClick={() => onOpenProject(r.path)}
          data-testid="recent-project-row"
        >
          <span className="shrink-0">📂</span>
          <span className="flex-1 truncate">{r.name}</span>
          <span className="text-text-tertiary text-[10px] shrink-0">{r.skillName}</span>
          <button
            className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-error-text text-[14px] shrink-0"
            onClick={e => removeRecent(r.name, e)}
            data-testid="recent-project-remove"
            aria-label={`从最近列表移除 ${r.name}`}
          >✕</button>
        </div>
      ))}
    </div>
  )
}

export function addRecentProject(project: RecentProject) {
  try {
    const stored = localStorage.getItem('do-zhou-recent-projects')
    const items: RecentProject[] = stored ? JSON.parse(stored) : []
    // 去重 + 排最前
    const filtered = items.filter(r => r.name !== project.name)
    filtered.unshift(project)
    localStorage.setItem('do-zhou-recent-projects', JSON.stringify(filtered.slice(0, 10)))
  } catch (_) {}
}

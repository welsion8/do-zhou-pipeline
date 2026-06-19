import { useState, useEffect, useCallback, useRef } from 'react'
import { WindowControls } from '../components/window-controls'

interface SkillData {
  id: string; name: string; version: string; category: string
  stages: string[]; projectCount: number; expanded: boolean; order: number
  _projects?: { name: string; path: string }[]
}

export function SkillHomePage({ onOpenProject, onEditSkill, onOpenSettings }: {
  onOpenProject?: (skillName: string, projectName: string, projectPath?: string) => void
  onEditSkill?: (skillName: string) => void
  onOpenSettings?: () => void
}): React.ReactElement {
  const [skills, setSkills] = useState<SkillData[]>([])
  const [loading, setLoading] = useState(true)
  const [importConflict, setImportConflict] = useState<{ sourcePath: string; existingName: string; message: string } | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [trashItems, setTrashItems] = useState<{ name: string; path: string }[]>([])
  const [deleteSkill, setDeleteSkill] = useState<string | null>(null)
  const [deleteWarning, setDeleteWarning] = useState('')
  const [projCtxMenu, setProjCtxMenu] = useState<{ x: number; y: number; skillName: string; projectName: string; projectPath?: string } | null>(null)
  const [renaming, setRenaming] = useState('')
  const [renameTarget, setRenameTarget] = useState('')
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const dragNode = useRef<HTMLDivElement | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await window.electronAPI?.skill?.getAll() || []
      // 加载每个 Skill 的真实项目列表
      const api = window.electronAPI
      const enriched = await Promise.all(list.map(async (s: SkillData) => {
        try {
          const projects = await api?.project?.list?.(s.name) || []
          return { ...s, projectCount: projects.length, _projects: projects }
        } catch (_) { return s }
      }))
      setSkills(enriched)
    } catch { /* empty */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { window.electronAPI?.trash?.list?.().then((l: any) => setTrashItems(l || [])).catch(() => {}) }, [])

  const confirmRename = () => {
    if (!renaming || renaming === renameTarget) { setRenaming(''); return }
    setSkills(prev => prev.map(s => ({ ...s, _projects: s._projects?.map((p: any) => p.name === renameTarget ? { ...p, name: renaming } : p) })))
    setRenaming('')
    window.electronAPI?.project?.rename?.(renameTarget, renaming).catch(() => load())
  }

  const handleImport = async () => {
    const result: any = await window.electronAPI?.skill?.import()
    if (!result) return
    if (result.conflict) { setImportConflict(result) } else { load() }
  }

  const toggleExpand = useCallback((id: string) => {
    setSkills(prev => prev.map(s => s.id === id ? { ...s, expanded: !s.expanded } : s))
  }, [])

  if (loading) {
    return <div className="h-full flex items-center justify-center text-text-tertiary text-[13px]">加载中...</div>
  }

  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
      {/* 内联重命名栏 */}
      {renaming && (
        <div className="shrink-0 flex items-center gap-[8px] px-[150px] py-[8px] bg-bg-active border-b border-border-default">
          <input className="flex-1 px-[10px] py-[4px] rounded-sm bg-bg-base border border-border-default text-text-primary text-[12px] outline-none focus:border-accent-dim"
            value={renaming} onChange={e => setRenaming(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { confirmRename() } if (e.key === 'Escape') setRenaming('') }} autoFocus />
          <button className="px-[8px] py-[3px] rounded-sm bg-accent-dim/20 text-accent text-[11px]" onClick={confirmRename} data-testid="modal-confirm">确认</button>
          <button className="px-[8px] py-[3px] rounded-sm bg-transparent text-text-tertiary text-[11px]" onClick={() => setRenaming('')} data-testid="modal-cancel">取消</button>
        </div>
      )}

      {/* ═══ 工具栏 (XJ3UP→LkzBG: h=52, pl=24, pr=120 给WinCtrl腾空间, WinCtrl absolute) ═══ */}
      <div className="shrink-0 flex items-center h-[52px] bg-bg-panel border-b border-border-default pl-[24px] pr-[120px] relative"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <span className="text-text-primary text-[16px] font-ui font-semibold">Do 舟</span>
        <div className="flex-1" />
        <div className="flex items-center gap-[8px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button className="px-[14px] py-[6px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover transition-colors" onClick={handleImport} data-testid="btn-import-skill">↑ 导入</button>
          <button className="px-[14px] py-[6px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover transition-colors" onClick={async () => {
            const result = await window.electronAPI?.skill?.export?.(skills.find(s => s.expanded)?.name || skills[0]?.name)
            if (result) console.log('导出成功:', result)
          }}>↗ 导出</button>
          <button className="px-[14px] py-[6px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover transition-colors" onClick={() => onEditSkill?.('__new__')} data-testid="btn-new-project">＋ 新建</button>
          <button className="px-[10px] py-[6px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover transition-colors" onClick={onOpenSettings} data-testid="btn-settings">⚙ 设置</button>
        </div>
        {/* XJ3UP: WinCtrl absolute, design x=1060(1200px帧 → 距右≈16px), 垂直居中 */}
        <div className="absolute right-[16px] top-1/2 -translate-y-1/2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <WindowControls />
        </div>
      </div>

      {/* ═══ 内容区 (XJ3UP→Cg0eG: gap=16, padding=32) ═══ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1070px] mx-auto px-[32px] py-[32px] flex flex-col gap-[16px]">

          {/* 页面标题区 (XJ3UP→Ms728) */}
          <div className="flex items-center justify-between">
            <h1 className="text-text-primary text-[18px] font-ui font-semibold">📚 技能包管理</h1>
            <span className="text-text-tertiary text-[13px] font-ui">共 {skills.length} 个技能包</span>
          </div>

          {/* 技能包列表 (XJ3UP→N3r4rb: gap=16) */}
          {skills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-[80px] gap-[16px]">
              <span className="text-[48px]">📚</span>
              <h2 className="text-[18px] text-text-primary font-ui font-semibold">还没有 Skill</h2>
              <p className="text-[13px] text-text-tertiary">导入或新建题材技能包开始写作</p>
              <div className="flex gap-[8px] mt-[8px]">
                <button className="px-[14px] py-[6px] rounded-sm border border-accent-dim text-accent text-[13px] bg-transparent hover:bg-accent-dim/10" onClick={handleImport} data-testid="btn-import-skill">↑ 导入 Skill</button>
                <button className="px-[14px] py-[6px] rounded-sm border border-border-default text-text-secondary text-[13px] bg-transparent hover:bg-bg-hover" onClick={() => onEditSkill?.('__new__')} data-testid="btn-new-project">＋ 新建 Skill</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-[16px]">
              {skills.map((skill, idx) => (
                <div key={skill.id}
                  className={`rounded-lg border border-border-default p-[16px] transition-all duration-150 ${idx === 0 ? 'bg-bg-panel' : 'bg-bg-base'} ${dragOverIdx === idx ? 'border-t-2 border-t-accent-dim' : ''} ${dragIdx === idx ? 'opacity-50 shadow-lg' : ''}`}
                  draggable
                  data-testid="skill-card"
                  onDragStart={e => { setDragIdx(idx); e.dataTransfer.effectAllowed = 'move' }}
                  onDragOver={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) setDragOverIdx(idx) }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={e => { e.preventDefault(); if (dragIdx !== null && dragIdx !== idx) { const reordered = [...skills]; const [moved] = reordered.splice(dragIdx, 1); reordered.splice(idx, 0, moved); setSkills(reordered.map((s, i) => ({ ...s, order: i }))) } setDragIdx(null); setDragOverIdx(null) }}
                  onDragEnd={() => { setDragIdx(null); setDragOverIdx(null) }}>
                  <button className="w-full flex items-center gap-[12px] text-left" onClick={() => toggleExpand(skill.id)}>
                    <span className="text-[20px]">{skill.expanded ? '▾' : '▸'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-[8px]">
                        <span className="text-text-primary text-[14px] font-ui font-semibold">{skill.name}</span>
                        <span className="text-text-tertiary text-[11px]">v{skill.version}</span>
                      </div>
                      <p className="text-text-tertiary text-[11px] mt-[2px]">{skill.category} · {skill.stages.length}个阶段 · {skill.projectCount}个项目</p>
                    </div>
                    <div className="flex items-center gap-[4px] opacity-0 group-hover:opacity-100">
                      <span className="text-text-tertiary text-[11px] hover:text-text-primary cursor-pointer" onClick={e => { e.stopPropagation(); onEditSkill?.(skill.id) }}>⚙</span>
                      <span className="text-text-tertiary text-[11px] hover:text-[#E57373] cursor-pointer" onClick={async e => { e.stopPropagation()
                        const result: any = await window.electronAPI?.skill?.delete?.(skill.id, false)
                        if (result && result.orphanProjects > 0 && !result.deleted) {
                          setDeleteSkill(skill.id)
                          setDeleteWarning(`该 Skill 下有 ${result.orphanProjects} 个项目，删除后这些项目将失去创作方法论指导，但项目文件不会被删除。是否继续？`)
                        } else if (result?.deleted) { load() }
                      }}>🗑</span>
                    </div>
                  </button>
                  {skill.expanded && (
                    <div className="mt-[12px] pt-[12px] border-t border-border-default">
                      {/* Skill 阶段信息 — 对齐设计帧: gap=8, fs=11, 阶段名=text-secondary */}
                      <div className="flex items-center gap-[8px] flex-wrap">
                        <span className="text-text-tertiary text-[11px] font-ui">创作阶段:</span>
                        {(skill.stages || []).map((s: string, i: number) => (
                          <span key={i} className="text-text-secondary text-[11px] font-ui">{s}{i < (skill.stages || []).length - 1 ? ' · ' : ''}</span>
                        ))}
                      </div>
                      <div className="h-[1px] bg-border-default my-[8px]" />
                      {skill.projectCount === 0 ? (
                        <p className="text-text-tertiary text-[12px] py-[8px]">暂无项目</p>
                      ) : (
                        <div className="flex flex-col gap-[4px]">
                          {(skill._projects || []).map((p, i) => (
                            <div key={i} className="flex items-center justify-between px-[8px] py-[6px] rounded-sm hover:bg-bg-active transition-colors cursor-pointer"
                              onClick={() => onOpenProject?.(skill.name, p.name, p.path)}
                              onContextMenu={(e) => { e.preventDefault(); setProjCtxMenu({ x: e.clientX, y: e.clientY, skillName: skill.name, projectName: p.name, projectPath: (p as any).path }) }}
                              data-testid="project-row"
                            >
                              <div className="flex items-center gap-[8px]">
                                <span className="text-text-tertiary text-[14px]">📁</span>
                                <span className="text-text-secondary text-[13px] font-ui">{p.name}</span>
                              </div>
                              <span className="text-text-tertiary text-[11px] font-ui">▸ {(skill.stages || []).map((s: string, j: number) => `${s}✅`).join(' ')}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* s2dfSC CardFooter: [⚙编辑] [↗导出] [🗑删除] */}
                      <div className="flex items-center gap-[4px] mt-[4px]">
                        <button className="px-[10px] py-[4px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[11px] hover:bg-bg-hover transition-colors"
                          onClick={(e) => { e.stopPropagation(); onEditSkill?.(skill.id) }}>⚙ 编辑</button>
                        <button className="px-[10px] py-[4px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[11px] hover:bg-bg-hover transition-colors"
                          onClick={async (e) => { e.stopPropagation(); await window.electronAPI?.skill?.export?.(skill.name) }}>↗ 导出</button>
                        <button className="px-[10px] py-[4px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[11px] hover:bg-bg-hover transition-colors"
                          onClick={async e => { e.stopPropagation(); const result: any = await window.electronAPI?.skill?.delete?.(skill.id, false); if (result && result.orphanProjects > 0 && !result.deleted) { setDeleteSkill(skill.id); setDeleteWarning(`该 Skill 下有 ${result.orphanProjects} 个项目，删除后这些项目将失去创作方法论指导，但项目文件不会被删除。是否继续？`) } else if (result?.deleted) { load() } }}>🗑 删除</button>
                      </div>
                      <button className="mt-[8px] px-[10px] py-[3px] rounded-sm bg-accent-dim/20 text-accent text-[11px] hover:bg-accent-dim/30"
                        onClick={async () => {
                          const name = `写作项目-${Date.now()}`
                          try {
                            const meta: any = await window.electronAPI?.project?.create?.(name, skill.name)
                            if (meta) onOpenProject?.(skill.name, name)
                          } catch (_) { /* fallback */ onOpenProject?.(skill.name, '__new__') }
                        }} data-testid="btn-new-project">＋ 新建项目</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 回收站面板 (XJ3UP→WBXZ8: cornerRadius=8, fill=$bg-panel, padding=16) */}
          <div className="rounded-lg border border-border-default bg-bg-panel p-[16px]" data-testid="recycle-panel">
            <div className="flex items-center justify-between mb-[8px]">
              <div className="flex items-center gap-[8px] cursor-pointer" onClick={() => setShowTrash(!showTrash)}>
                <span className="text-text-secondary text-[13px] font-ui font-semibold">🗑 回收站 ({trashItems.length})</span>
                <span className="text-text-tertiary text-[11px]">{showTrash ? '▾' : '▸'}</span>
              </div>
              {trashItems.length > 0 && (
                <button className="px-[10px] py-[3px] rounded-sm bg-transparent border border-border-default text-text-tertiary text-[11px] hover:bg-bg-hover transition-colors"
                  onClick={async () => { await window.electronAPI?.trash?.empty?.(); load() }}>清空</button>
              )}
            </div>
            {showTrash && (
              <div className="flex flex-col gap-[4px]">
                {trashItems.length === 0 ? (
                  <p className="text-text-tertiary text-[12px] py-[4px]">回收站为空</p>
                ) : (
                  trashItems.map((item, i) => (
                    <div key={i} className="flex items-center justify-between px-[16px] py-[4px] rounded-sm hover:bg-bg-active" data-testid="recycle-item">
                      <span className="text-text-secondary text-[12px]">{item.name}</span>
                      <button className="text-text-tertiary text-[11px] hover:text-accent"
                        onClick={async () => {
                          try { await window.electronAPI?.trash?.restore?.(item.name, 'rename'); load() }
                          catch (_) { setConfirmMsg?.('恢复路径已存在同名项目。是否覆盖？'); /* Spec §2: 恢复冲突→覆盖/重命名/取消 */ }
                        }}>恢复</button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 删除 Skill 警告弹窗 */}
      {deleteSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteSkill(null)} data-testid="modal-overlay">
          <div className="bg-bg-panel border border-border-default rounded-md p-[24px] max-w-[440px] shadow-xl" onClick={e => e.stopPropagation()} data-testid="modal-body">
            <p className="text-[#E57373] text-[13px] font-ui font-semibold mb-[4px]" data-testid="modal-title">⚠ 删除 Skill</p>
            <p className="text-text-secondary text-[12px] mb-[16px]">{deleteWarning}</p>
            <div className="flex gap-[8px] justify-end">
              <button className="px-[12px] py-[5px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px]" onClick={() => setDeleteSkill(null)} data-testid="modal-cancel">取消</button>
              <button className="px-[12px] py-[5px] rounded-sm bg-[#E57373]/20 border border-[#E57373]/30 text-[#E57373] text-[12px]" onClick={async () => {
                await window.electronAPI?.skill?.delete?.(deleteSkill, true)
                setDeleteSkill(null); load()
              }} data-testid="modal-confirm">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 项目右键菜单 */}
      {projCtxMenu && (
        <div className="fixed inset-0 z-50" onClick={() => setProjCtxMenu(null)}>
          <div className="absolute bg-bg-panel border border-border-default rounded-md shadow-lg py-[4px] w-[180px]" style={{ left: projCtxMenu.x, top: projCtxMenu.y }} onClick={e => e.stopPropagation()}>
            <div className="px-[16px] py-[4px] text-text-tertiary text-[10px] truncate">{projCtxMenu.projectName}</div>
            <div className="h-[1px] bg-border-default my-[2px]" />
            <div className="px-[16px] py-[8px] text-[12px] text-text-primary hover:bg-bg-active cursor-pointer" onClick={() => { onOpenProject?.(projCtxMenu.skillName, projCtxMenu.projectName, projCtxMenu.projectPath); setProjCtxMenu(null) }}>📂 打开</div>
            <div className="px-[16px] py-[8px] text-[12px] text-text-primary hover:bg-bg-active cursor-pointer" onClick={() => {
              setRenameTarget(projCtxMenu.projectName); setRenaming(projCtxMenu.projectName); setProjCtxMenu(null)
            }}>✏️ 重命名</div>
            <div className="h-[1px] bg-border-default my-[2px]" />
            <div className="px-[16px] py-[8px] text-[12px] text-text-primary hover:bg-bg-active cursor-pointer" onClick={async () => {
              try { await window.electronAPI?.project?.delete?.(projCtxMenu.projectName); load() } catch (_) {}
              setProjCtxMenu(null)
            }}>🗑 移入回收站</div>
          </div>
        </div>
      )}

      {/* 导入冲突弹窗 */}
      {importConflict && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setImportConflict(null)} data-testid="modal-overlay">
          <div className="bg-bg-panel border border-border-default rounded-md p-[24px] max-w-[440px] shadow-xl" onClick={e => e.stopPropagation()} data-testid="modal-body">
            <p className="text-text-primary text-[13px] font-ui mb-[4px]" data-testid="modal-title">⚠ Skill 导入冲突</p>
            <p className="text-text-secondary text-[12px] mb-[16px]">{importConflict.message}</p>
            <div className="flex gap-[8px] justify-end">
              <button className="px-[12px] py-[5px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px]" onClick={() => setImportConflict(null)} data-testid="modal-cancel">取消</button>
              <button className="px-[12px] py-[5px] rounded-sm bg-accent-dim/20 border border-accent-dim text-accent text-[12px] hover:bg-accent-dim/30" onClick={async () => {
                await window.electronAPI?.skill?.importOverwrite?.(importConflict.sourcePath, importConflict.existingName)
                setImportConflict(null); load()
              }} data-testid="modal-confirm">覆盖现有</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

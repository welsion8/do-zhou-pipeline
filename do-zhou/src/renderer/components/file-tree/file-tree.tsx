import { useState, useCallback } from 'react'
import { FileTreeContextMenu } from './file-tree-context-menu'
import { useFileSystem } from '../../hooks/use-file-system'

type Entry = { name: string; isDirectory: boolean }

export function FileTree({ entries, projectPath, onFileClick, onRefresh, loading }: {
  entries: Entry[]; projectPath?: string; onFileClick?: (n: string) => void; onRefresh?: () => void; loading?: boolean
}): React.ReactElement {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['chapters']))
  const [childrenCache, setChildrenCache] = useState<Record<string, Entry[]>>({})
  const [ctx, setCtx] = useState<{ x: number; y: number; name: string; isDir: boolean } | null>(null)
  const [renameDialog, setRenameDialog] = useState<{ oldName: string } | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [sectionCollapsed, setSectionCollapsed] = useState(false)
  const { listFiles, renameFile, deleteFile } = useFileSystem()

  const visible = entries.filter(e => e.name !== '.session' && e.name !== '.gitkeep')
  const dirs = visible.filter(e => e.isDirectory)
  const topFiles = visible.filter(e => !e.isDirectory)

  const toggle = useCallback(async (dirName: string) => {
    setExpanded(p => {
      const next = new Set(p)
      if (next.has(dirName)) { next.delete(dirName); return next }
      next.add(dirName)
      if (!childrenCache[dirName] && projectPath) {
        listFiles(`${projectPath}/${dirName}`).then(kids => {
          setChildrenCache(prev => ({ ...prev, [dirName]: kids }))
        })
      }
      return next
    })
  }, [childrenCache, projectPath, listFiles])

  const doRename = async (newName: string) => {
    if (!renameDialog || !newName) return
    try {
      const dir = renameDialog.oldName.includes('/') ? renameDialog.oldName.split('/')[0] + '/' : ''
      await renameFile(renameDialog.oldName, dir + newName)
      setChildrenCache({})
      onRefresh?.()
    } catch (_) { /* ignore */ }
    setRenameDialog(null)
  }

  const doDelete = async () => {
    if (!deleteConfirm) return
    try {
      await deleteFile(deleteConfirm)
      setChildrenCache({})
      onRefresh?.()
    } catch (_) { /* ignore */ }
    setDeleteConfirm(null)
  }

  const openInEditor = (name: string, parentDir?: string) => {
    const editorApi = (window as unknown as Record<string, unknown>).__editorAPI as { openFile?: (path: string, title?: string) => void } | undefined
    const relPath = parentDir ? `${parentDir}/${name}` : name
    const fullPath = projectPath ? `${projectPath}/${relPath}` : relPath
    if (editorApi?.openFile) {
      editorApi.openFile(fullPath, name)
    }
    onFileClick?.(relPath)
  }

  const entryCls = (isDir: boolean, isChapter: boolean) =>
    `text-[11px] font-ui cursor-pointer select-none px-[16px] py-[2px] hover:bg-bg-hover transition-all duration-75 ${isDir ? 'text-text-secondary' : isChapter ? 'text-text-primary font-semibold' : 'text-text-primary font-semibold'}`

  if (loading) return <div className="text-text-tertiary text-[11px] px-[16px] py-[8px]">加载中...</div>

  return (
    <div className="flex flex-col gap-[2px]">
      <p className="text-text-tertiary text-[11px] font-ui font-semibold px-[16px] py-[4px] select-none cursor-pointer hover:text-text-secondary transition-colors duration-150"
        onClick={() => setSectionCollapsed(p => !p)}>
        <span className="inline-block transition-transform duration-200 ease-out"
          style={{ transform: sectionCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)' }}>▾</span>
        {' '}📁 项目文件
      </p>

      <div className={`overflow-hidden transition-all duration-200 ease-out ${sectionCollapsed ? 'max-h-0 opacity-0' : 'max-h-[999px] opacity-100'}`}>
        {topFiles.map(e => (
          <div key={e.name} className={entryCls(false, e.name.startsWith('Chapter-'))}
            onClick={() => openInEditor(e.name)}
            onContextMenu={ev => { ev.preventDefault(); setCtx({ x: ev.clientX, y: ev.clientY, name: e.name, isDir: false }) }}
            data-testid="file-item">
            📄 {e.name}
          </div>
        ))}

        {dirs.map(dir => {
        const isExp = expanded.has(dir.name)
        const children = childrenCache[dir.name] ?? []
        return (
          <div key={dir.name}>
            <div className={entryCls(true, false)}
              onClick={() => toggle(dir.name)}
              onContextMenu={ev => { ev.preventDefault(); setCtx({ x: ev.clientX, y: ev.clientY, name: dir.name, isDir: true }) }}
              data-testid="file-item">
              <span className="inline-block transition-transform duration-200 ease-out"
                style={{ transform: isExp ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
              {' '}📂 {dir.name}
            </div>
            <div className={`overflow-hidden transition-all duration-200 ease-out ${isExp ? 'max-h-[999px] opacity-100' : 'max-h-0 opacity-0'}`}>
              {children.length === 0 && (
                <div className="text-text-tertiary text-[10px] pl-[40px] py-[2px]">(空)</div>
              )}
              {children.map(c => (
                <div key={c.name} className={entryCls(false, true) + ' pl-[24px]'}
                  onClick={() => openInEditor(c.name, dir.name)}
                  onContextMenu={ev => { ev.preventDefault(); setCtx({ x: ev.clientX, y: ev.clientY, name: `${dir.name}/${c.name}`, isDir: false }) }}
                  data-testid="file-item">
                  📄 {c.name}
                </div>
              ))}
            </div>
          </div>
        )
      })}
      </div>

      {ctx && <FileTreeContextMenu x={ctx.x} y={ctx.y} onClose={() => setCtx(null)}
        onOpen={() => { openInEditor(ctx.name); setCtx(null) }}
        onRename={() => { setRenameDialog({ oldName: ctx.name }); setCtx(null) }}
        onDelete={() => { setDeleteConfirm(ctx.name); setCtx(null) }} />}

      {/* Rename dialog */}
      {renameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setRenameDialog(null)} data-testid="modal-overlay">
          <div className="bg-bg-panel border border-border-default rounded-md p-[24px] w-[440px] shadow-lg" onClick={e => e.stopPropagation()} data-testid="modal-body">
            <p className="text-text-primary text-[14px] font-ui font-semibold mb-[12px]" data-testid="modal-title">重命名</p>
            <input id="rename-input" className="w-full px-[12px] py-[8px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-border-hover mb-[12px]"
              defaultValue={renameDialog.oldName.split('/').pop() ?? renameDialog.oldName}
              onKeyDown={e => { if (e.key === 'Enter') doRename((e.target as HTMLInputElement).value); if (e.key === 'Escape') setRenameDialog(null) }} autoFocus />
            <div className="flex justify-end gap-[8px]">
              <button onClick={() => setRenameDialog(null)} className="px-[14px] py-[5px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" data-testid="modal-cancel">取消</button>
              <button onClick={() => doRename((document.getElementById('rename-input') as HTMLInputElement)?.value ?? '')} className="px-[14px] py-[5px] rounded-sm bg-bg-active border border-border-hover text-text-primary text-[12px] hover:bg-bg-hover" data-testid="modal-confirm">确认</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setDeleteConfirm(null)} data-testid="modal-overlay">
          <div className="bg-bg-panel border border-border-default rounded-md p-[24px] w-[440px] shadow-lg" onClick={e => e.stopPropagation()} data-testid="modal-body">
            <p className="text-[#E57373] text-[14px] font-ui font-semibold mb-[8px]" data-testid="modal-title">⚠ 确认删除</p>
            <p className="text-text-secondary text-[13px] mb-[16px]">确定要删除 "{deleteConfirm}" 吗？此操作不可撤销。</p>
            <div className="flex justify-end gap-[8px]">
              <button onClick={() => setDeleteConfirm(null)} className="px-[14px] py-[5px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" data-testid="modal-cancel">取消</button>
              <button onClick={doDelete} className="px-[14px] py-[5px] rounded-sm bg-[#3D2020] border border-[#E57373] text-[#E57373] text-[12px] hover:opacity-80" data-testid="modal-confirm">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

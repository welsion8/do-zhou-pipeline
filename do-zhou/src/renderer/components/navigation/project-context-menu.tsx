import { useEffect, useRef } from 'react'

interface Props {
  x: number; y: number
  projectName: string
  onClose: () => void
  onOpen: () => void
  onRename: () => void
  onPinToTop: () => void
  onMoveToTrash: () => void
  onDeletePermanently: () => void
}

export function ProjectContextMenu({
  x, y, projectName, onClose, onOpen, onRename, onPinToTop, onMoveToTrash, onDeletePermanently,
}: Props): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const item = 'px-[16px] py-[8px] text-[12px] text-text-primary font-ui hover:bg-bg-active cursor-pointer select-none'
  const divider = <div className="h-[1px] bg-border-default my-[2px]" />
  const dangerItem = 'px-[16px] py-[8px] text-[12px] text-[#E57373] font-ui hover:bg-bg-active cursor-pointer select-none'

  return (
    <div ref={ref} className="fixed z-50 w-[200px] bg-bg-panel border border-border-default rounded-md shadow-lg py-[4px]" style={{ left: x, top: y }}>
      <div className="px-[16px] py-[4px] text-text-tertiary text-[10px] font-ui truncate">{projectName}</div>
      {divider}
      <div className={item} onClick={() => { onOpen(); onClose() }}>📂 打开</div>
      <div className={item} onClick={() => { onRename(); onClose() }}>✏️ 重命名</div>
      <div className={item} onClick={() => { onPinToTop(); onClose() }}>📌 置顶</div>
      {divider}
      <div className={item} onClick={() => { onMoveToTrash(); onClose() }}>🗑 移入回收站</div>
      <div className={dangerItem} onClick={() => { onDeletePermanently(); onClose() }}>⚠ 彻底删除</div>
    </div>
  )
}

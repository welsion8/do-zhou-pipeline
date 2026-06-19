import { useEffect, useRef } from 'react'

export function FileTreeContextMenu({ x, y, onClose, onOpen, onRename, onDelete }: {
  x: number; y: number; onClose: () => void; onOpen: () => void; onRename: () => void; onDelete: () => void
}): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const item = 'px-[16px] py-[8px] text-[12px] text-text-primary font-ui hover:bg-bg-active cursor-pointer'

  return (
    <div ref={ref} className="fixed z-50 w-[180px] bg-bg-panel border border-border-default rounded-md shadow-lg py-[4px]" style={{ left: x, top: y }}>
      <div className={item} onClick={onOpen}>📂 打开</div>
      <div className={item} onClick={onRename}>✏️ 重命名</div>
      <div className="h-[1px] bg-border-default my-[2px]" />
      <div className={`${item} text-[#E57373] hover:bg-[#3D2020]`} onClick={onDelete}>🗑 删除</div>
    </div>
  )
}

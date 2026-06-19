import { useEffect, useRef } from 'react'

interface TabContextMenuProps {
  x: number; y: number
  tabTitle: string
  filePath: string
  onClose: () => void
  onCloseTab: () => void
  onCloseOthers: () => void
  onCloseAll: () => void
}

export function TabContextMenu({
  x, y, tabTitle, filePath, onClose, onCloseTab, onCloseOthers, onCloseAll,
}: TabContextMenuProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const item = 'px-[16px] py-[8px] text-[12px] text-text-primary font-ui hover:bg-bg-active cursor-pointer select-none'
  const divider = <div className="h-[1px] bg-border-default my-[2px]" />

  const handleCopyPath = async () => {
    try { await navigator.clipboard.writeText(filePath) } catch (_) { /* ignore */ }
    onClose()
  }

  return (
    <div ref={ref} className="fixed z-50 w-[180px] bg-bg-panel border border-border-default rounded-md shadow-lg py-[4px]" style={{ left: x, top: y }}>
      <div className={`${item} text-text-tertiary text-[10px] px-[16px] py-[4px] truncate`} title={tabTitle}>
        {tabTitle}
      </div>
      {divider}
      <div className={item} onClick={() => { onCloseTab(); onClose() }}>✕ 关闭</div>
      <div className={item} onClick={() => { onCloseOthers(); onClose() }}>关闭其他</div>
      <div className={item} onClick={() => { onCloseAll(); onClose() }}>关闭所有</div>
      {divider}
      <div className={item} onClick={handleCopyPath}>📋 复制文件路径</div>
    </div>
  )
}

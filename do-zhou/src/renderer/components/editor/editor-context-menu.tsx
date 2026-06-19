import { useEffect, useRef } from 'react'

interface EditorContextMenuProps {
  x: number; y: number
  onClose: () => void
  onCopy: () => void
  onCut: () => void
  onPaste: () => void
  onAiRewrite: () => void
  onAiPolish: () => void
  onAiExpand: () => void
}

export function EditorContextMenu({
  x, y, onClose, onCopy, onCut, onPaste, onAiRewrite, onAiPolish, onAiExpand,
}: EditorContextMenuProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  const item = 'px-[16px] py-[8px] text-[12px] text-text-primary font-ui hover:bg-bg-active cursor-pointer select-none'
  const divider = <div className="h-[1px] bg-border-default my-[2px]" />

  return (
    <div ref={ref} className="fixed z-50 w-[200px] bg-bg-panel border border-border-default rounded-md shadow-lg py-[4px]" style={{ left: x, top: y }}>
      <div className={item} onClick={() => { onCopy(); onClose() }}>📋 复制</div>
      <div className={item} onClick={() => { onCut(); onClose() }}>✂️ 剪切</div>
      <div className={item} onClick={() => { onPaste(); onClose() }}>📄 粘贴</div>
      {divider}
      <div className={item + ' text-accent'} onClick={() => { onAiRewrite(); onClose() }}>🤖 AI 重写</div>
      <div className={item + ' text-accent'} onClick={() => { onAiPolish(); onClose() }}>✨ AI 润色</div>
      <div className={item + ' text-accent'} onClick={() => { onAiExpand(); onClose() }}>📝 AI 扩写</div>
    </div>
  )
}

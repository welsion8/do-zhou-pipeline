import { useCallback, useRef, useEffect, useState } from 'react'

interface Props { onResize: (d: number) => void; minSize: number; maxSize: number }

export function ResizableDivider({ onResize, minSize, maxSize }: Props): React.ReactElement {
  const [dragging, setDragging] = useState(false)
  const [hovering, setHovering] = useState(false)
  const startX = useRef(0)

  const onDown = useCallback((e: React.MouseEvent) => { e.preventDefault(); setDragging(true); startX.current = e.clientX }, [])

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => { onResize(e.clientX - startX.current); startX.current = e.clientX }
    const onUp = () => setDragging(false)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging, onResize])

  const active = dragging || hovering
  return (
    <div className="relative shrink-0 cursor-col-resize z-10" style={{ width: 7, marginLeft: -3, marginRight: -3 }}
      onMouseDown={onDown} onMouseEnter={() => setHovering(true)} onMouseLeave={() => setHovering(false)}>
      <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 transition-all duration-150"
        style={{ width: active ? 4 : 1, backgroundColor: active ? 'var(--color-accent-dim)' : 'transparent' }} />
    </div>
  )
}

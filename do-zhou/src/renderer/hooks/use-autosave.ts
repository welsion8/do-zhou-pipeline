import { useEffect, useRef, useCallback } from 'react'

interface UseAutosaveOptions {
  intervalMs?: number       // 自动保存间隔，默认 2000ms
  enabled?: boolean         // 是否启用自动保存
  onSave: () => void        // 保存回调
  dirty: boolean            // 是否有未保存内容
}

export function useAutosave({ intervalMs = 2000, enabled = true, onSave, dirty }: UseAutosaveOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef = useRef(onSave)
  onSaveRef.current = onSave

  // 自动保存定时器
  useEffect(() => {
    if (!enabled || !dirty) return
    timerRef.current = setInterval(() => {
      onSaveRef.current()
    }, intervalMs)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [enabled, dirty, intervalMs])

  // Ctrl+S 强制保存
  const forceSave = useCallback(() => {
    onSaveRef.current()
  }, [])

  // 键盘监听
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        forceSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [forceSave])

  return { forceSave }
}

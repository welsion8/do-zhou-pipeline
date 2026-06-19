import { useState, useCallback, useEffect } from 'react'

export function WindowControls(): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false)
  const api = window.electronAPI

  useEffect(() => {
    api?.window.isMaximized().then(setIsMaximized)
  }, [api])

  const btn = 'px-[12px] py-[4px] bg-transparent hover:bg-bg-hover transition-all duration-150 text-[11px]'

  return (
    <div className="flex items-center shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button onClick={() => api?.window.minimize()} className={btn + ' text-text-tertiary'} aria-label="最小化">─</button>
      <button onClick={() => { api?.window.maximize(); setIsMaximized(!isMaximized) }} className={btn + ' text-text-tertiary'} aria-label="最大化">{isMaximized ? '❐' : '□'}</button>
      <button onClick={() => api?.window.close()} className={btn + ' text-text-secondary hover:bg-[#3D2020] hover:text-[#E57373]'} aria-label="关闭">✕</button>
    </div>
  )
}

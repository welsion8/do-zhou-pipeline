import { useState, useCallback, useEffect } from 'react'
import { useAIState } from '../hooks/use-ai-state'

export function WindowControls(): React.ReactElement {
  const [isMaximized, setIsMaximized] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { isStreaming } = useAIState()
  const api = window.electronAPI

  useEffect(() => {
    api?.window.isMaximized().then(setIsMaximized)
  }, [api])

  const handleClose = useCallback(() => {
    if (isStreaming) {
      setShowCloseConfirm(true)
    } else {
      api?.window.close()
    }
  }, [isStreaming, api])

  const btn = 'px-[12px] py-[4px] bg-transparent hover:bg-bg-hover transition-all duration-150 text-[11px]'

  return (
    <div className="flex items-center shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      <button onClick={() => api?.window.minimize()} className={btn + ' text-text-tertiary'} aria-label="最小化">─</button>
      <button onClick={() => { api?.window.maximize(); setIsMaximized(!isMaximized) }} className={btn + ' text-text-tertiary'} aria-label="最大化">{isMaximized ? '❐' : '□'}</button>
      <button onClick={handleClose} className={btn + ' text-text-secondary hover:bg-[#3D2020] hover:text-[#E57373]'} aria-label="关闭">✕</button>

      {/* 关闭确认弹窗 — AI 生成中关闭保护 */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCloseConfirm(false)}>
          <div className="bg-bg-panel border border-border-default rounded-md p-[24px] max-w-[440px] shadow-xl" onClick={e => e.stopPropagation()} data-testid="modal-overlay">
            <h3 className="text-text-primary text-[15px] font-ui font-semibold mb-[8px]">AI 正在生成内容</h3>
            <p className="text-text-secondary text-[12px] mb-[16px] leading-[1.6]">
              关闭应用将中断 AI 生成。已生成的内容会保留，未完成的部分需要重新生成。确定要关闭吗？
            </p>
            <div className="flex justify-end gap-[8px]">
              <button className="px-[16px] py-[6px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover"
                onClick={() => setShowCloseConfirm(false)} data-testid="modal-cancel">取消</button>
              <button className="px-[16px] py-[6px] rounded-sm bg-[#3D2020] border border-[#E57373] text-[#E57373] text-[12px] hover:bg-[#4D3030]"
                onClick={() => api?.window.close()} data-testid="modal-confirm">确认关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

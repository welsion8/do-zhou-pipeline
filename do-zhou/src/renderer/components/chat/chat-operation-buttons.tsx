import { useState, useCallback } from 'react'

interface Props {
  /** AI 写入的目标文件名（如 "outline.md"） */
  fileName: string
  /** 用户是否自 AI 写入后手动修改过该文件 */
  userModified?: boolean
  /** 点击"手动调整" → 切换到编辑器打开该文件 */
  onManualEdit?: (fileName: string) => void
  /** 点击"重新生成" → 重新发送阶段指令给 AI */
  onRegenerate?: (fileName: string, extraRequirement?: string) => void
}

export function ChatOperationButtons({ fileName, userModified, onManualEdit, onRegenerate }: Props): React.ReactElement {
  const [confirmRegen, setConfirmRegen] = useState(false)
  const [extraReq, setExtraReq] = useState('')

  const handleRegenClick = useCallback(() => {
    setConfirmRegen(true)
  }, [])

  const handleRegenConfirm = useCallback(() => {
    setConfirmRegen(false)
    setExtraReq('')
    onRegenerate?.(fileName, extraReq || undefined)
  }, [fileName, extraReq, onRegenerate])

  const handleRegenCancel = useCallback(() => {
    setConfirmRegen(false)
    setExtraReq('')
  }, [])

  const handleManualEdit = useCallback(() => {
    onManualEdit?.(fileName)
  }, [fileName, onManualEdit])

  return (
    <div className="mt-[10px] pt-[8px] border-t border-border-default">
      {/* 操作按钮行 */}
      <div className="flex items-center gap-[8px] flex-wrap">
        {/* 已写入标签 — 只读 */}
        <span className="inline-flex items-center gap-[4px] px-[10px] py-[4px] rounded-md bg-bg-active text-text-tertiary text-[11px] font-ui select-none">
          📝 已写入 {fileName}
        </span>

        {/* 手动调整按钮 */}
        <button
          className="inline-flex items-center px-[10px] py-[4px] rounded-md border border-border-default text-text-secondary text-[11px] font-ui hover:bg-bg-active hover:text-text-primary transition-colors"
          onClick={handleManualEdit}
        >
          ✏️ 手动调整
        </button>

        {/* 重新生成按钮 */}
        {!confirmRegen ? (
          <button
            className="inline-flex items-center px-[10px] py-[4px] rounded-md border border-border-default text-text-secondary text-[11px] font-ui hover:bg-bg-active hover:text-text-primary transition-colors"
            onClick={handleRegenClick}
          >
            🔄 重新生成
          </button>
        ) : (
          <div className="flex items-center gap-[6px]">
            {userModified ? (
              <span className="text-[#EF9A9A] text-[11px] font-ui">
                检测到手动修改，重新生成将覆盖你的修改。是否继续？
              </span>
            ) : (
              <span className="text-text-tertiary text-[11px] font-ui">
                将覆盖当前文件内容，是否继续？
              </span>
            )}
            <input
              className="w-[140px] px-[8px] py-[3px] rounded-md bg-bg-base border border-border-default text-text-primary text-[11px] font-ui placeholder:text-text-tertiary outline-none focus:border-accent-dim"
              placeholder="附加要求（可选）"
              value={extraReq}
              onChange={e => setExtraReq(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleRegenConfirm() }}
            />
            <button
              className="px-[8px] py-[3px] rounded-md bg-accent-dim text-white text-[11px] font-ui hover:opacity-90 transition-opacity"
              onClick={handleRegenConfirm}
            >
              确认
            </button>
            <button
              className="px-[8px] py-[3px] rounded-md border border-border-default text-text-tertiary text-[11px] font-ui hover:bg-bg-active transition-colors"
              onClick={handleRegenCancel}
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

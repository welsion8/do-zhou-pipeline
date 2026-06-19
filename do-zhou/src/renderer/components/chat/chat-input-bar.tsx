import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  onSend: (content: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInputBar({ onSend, disabled, placeholder = '输入消息...' }: Props): React.ReactElement {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
  }, [value, disabled, onSend])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }, [handleSend])

  // 自动调整高度
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [value])

  const isEmpty = !value.trim()

  return (
    <div className="flex items-end gap-[8px] p-[16px] border-t border-border-default shrink-0">
      <textarea
        ref={inputRef}
        className="flex-1 px-[12px] py-[8px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[12px] leading-[1.6] font-ui outline-none focus:border-border-hover resize-none transition-colors disabled:opacity-30"
        rows={1}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? 'AI 正在生成中...' : placeholder}
        disabled={disabled}
        data-testid="chat-input"
        aria-label="输入消息"
      />
      <button
        className={`px-[14px] py-[8px] rounded-sm border text-[12px] font-ui transition-all duration-150 ${
          isEmpty || disabled
            ? 'border-border-default text-text-tertiary opacity-30 cursor-not-allowed'
            : 'bg-accent-dim/20 border-accent-dim text-accent hover:bg-accent-dim/30'
        }`}
        onClick={handleSend}
        disabled={isEmpty || disabled}
        data-testid="btn-send"
      >
        发送
      </button>
    </div>
  )
}

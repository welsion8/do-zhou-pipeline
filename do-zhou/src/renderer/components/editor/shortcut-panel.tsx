/**
 * 快捷键参考面板 — 对应设计帧 vWwKc
 * 显示在编辑器上方，列出所有可用快捷键
 */
import { useState } from 'react'

const SHORTCUTS = [
  { keys: 'Ctrl+S', desc: '强制保存当前标签页' },
  { keys: 'Ctrl+Z', desc: '撤销' },
  { keys: 'Ctrl+Shift+Z', desc: '重做' },
  { keys: 'Ctrl+Tab', desc: '切换下一个标签页' },
  { keys: 'Ctrl+W', desc: '关闭当前标签页' },
  { keys: 'Ctrl+F', desc: '编辑器内查找文本' },
  { keys: 'Ctrl+H', desc: '查找并替换' },
]

export function ShortcutPanel(): React.ReactElement {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        className="flex items-center gap-[4px] text-text-tertiary text-[11px] hover:text-text-secondary transition-colors"
        onClick={() => setOpen(!open)}
        title="快捷键参考"
      >
        <span>⌨</span>
        <span>快捷键</span>
      </button>
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div
            className="absolute top-[60px] right-[16px] w-[320px] bg-bg-panel border border-border-default rounded-md shadow-xl"
            style={{ clip: true } as React.CSSProperties}
            onClick={e => e.stopPropagation()}
            data-testid="shortcut-panel"
          >
            <div className="flex items-center justify-between px-[16px] py-[8px] border-b border-border-default">
              <span className="text-text-primary text-[12px] font-ui font-semibold" data-testid="modal-title">⌨ 快捷键</span>
              <button
                className="text-text-tertiary text-[14px] hover:text-text-primary"
                onClick={() => setOpen(false)}
                data-testid="modal-close"
              >
                ×
              </button>
            </div>
            <div className="flex flex-col gap-[2px] p-[8px]">
              {SHORTCUTS.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-[8px] py-[4px] rounded-sm hover:bg-bg-active"
                >
                  <span className="text-text-secondary text-[12px] font-ui">{s.desc}</span>
                  <span className="text-text-tertiary text-[11px] font-mono bg-bg-active px-[6px] py-[1px] rounded-sm">
                    {s.keys}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

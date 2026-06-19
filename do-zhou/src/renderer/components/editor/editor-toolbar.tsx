interface EditorToolbarProps {
  mode: 'edit' | 'preview'
  onToggleMode: () => void
  onNewFile: () => void
}

export function EditorToolbar({ mode, onToggleMode, onNewFile }: EditorToolbarProps): React.ReactElement {
  const ghostBtn = 'px-[10px] py-[3px] rounded-sm bg-transparent border border-transparent text-[11px] text-text-secondary font-ui hover:bg-bg-active hover:text-text-primary transition-colors duration-75 flex items-center gap-[4px]'

  return (
    <div className="flex items-center justify-end gap-[8px] px-[16px] py-[4px] shrink-0" data-testid="editor-toolbar">
      <button className={ghostBtn} onClick={onNewFile}>
        + 新建
      </button>
      <button className={ghostBtn} onClick={onToggleMode}>
        {mode === 'edit' ? '👁 预览' : '✏️ 编辑'}
      </button>
    </div>
  )
}

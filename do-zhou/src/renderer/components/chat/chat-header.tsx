interface Props {
  tokenCount?: number
  onSearch?: () => void
  onExport?: () => void
}

export function ChatHeader({ tokenCount, onSearch, onExport }: Props): React.ReactElement {
  return (
    <div className="flex items-center justify-between px-[16px] py-[8px] border-b border-border-default shrink-0">
      <span className="text-text-secondary text-[12px] font-ui font-semibold">AI 对话</span>
      <div className="flex items-center gap-[8px]">
        {tokenCount !== undefined && (
          <span className="text-text-tertiary text-[10px] font-ui">📊 {(tokenCount / 1000).toFixed(1)}K</span>
        )}
        <button className="text-text-tertiary text-[12px] hover:text-text-secondary transition-colors" onClick={onSearch} data-testid="btn-search" aria-label="搜索对话">🔍</button>
        <button className="text-text-tertiary text-[12px] hover:text-text-secondary transition-colors" onClick={onExport} data-testid="btn-export" aria-label="导出对话">📤</button>
      </div>
    </div>
  )
}

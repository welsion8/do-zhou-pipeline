import { type StageDef, type StageId } from '../../hooks/use-stage-navigation'

interface Props {
  stage: StageDef
  isActive: boolean
  isExpanded: boolean
  chapters: string[]
  onClick: (id: StageId) => void
  onChapterJump: (chapterNo: number) => void
  chapterJumpInput: string
  onChapterJumpInputChange: (v: string) => void
}

export function StageCardItem({
  stage, isActive, isExpanded, chapters, onClick, onChapterJump,
  chapterJumpInput, onChapterJumpInputChange,
}: Props): React.ReactElement {
  const { id, icon, label, state } = stage
  const isWriting = id === 'chapter_writing'

  // 状态样式
  const stateStyles: Record<string, string> = {
    '⏹': 'bg-transparent text-text-tertiary',
    '⟳': 'bg-bg-active border-l-[2px] border-accent-dim text-text-primary font-semibold',
    '✅': 'bg-transparent text-text-secondary',
  }

  const stateIcons: Record<string, string> = { '⏹': '⏹', '⟳': '⟳', '✅': '✅' }

  return (
    <div>
      {/* 阶段卡片本体 */}
      <button
        className={`w-full flex items-center gap-[6px] px-[16px] py-[6px] text-left text-[12px] font-ui rounded-r-sm transition-colors hover:bg-bg-active ${stateStyles[state]} ${isActive ? 'ring-1 ring-inset ring-accent-dim/30' : ''}`}
        onClick={() => onClick(id)}
        data-testid="stage-card"
      >
        <span className="text-[11px] w-[16px] shrink-0 text-center">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        <span className="text-[11px] shrink-0">{stateIcons[state]}</span>
      </button>

      {/* 阶段④展开：章节列表 + 跳转输入 */}
      {isWriting && isExpanded && (
        <div className="ml-[22px] border-l-[2px] border-accent-dim/30 pl-[12px] mt-[2px] space-y-[2px]">
          {/* 章节跳转输入 */}
          <div className="flex items-center gap-[4px] py-[2px]">
            <input
              className="flex-1 bg-bg-base border border-border-default rounded-sm px-[6px] py-[2px] text-text-primary text-[11px] font-ui placeholder:text-text-tertiary outline-none focus:border-accent-dim"
              placeholder="🔍 跳转到第N章..."
              value={chapterJumpInput}
              onChange={e => onChapterJumpInputChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const n = parseInt(chapterJumpInput)
                  if (n > 0) { onChapterJump(n); onChapterJumpInputChange('') }
                }
              }}
            />
          </div>
          {/* 章节列表 */}
          {chapters.length === 0 ? (
            <p className="text-text-tertiary text-[10px] font-ui py-[4px]">暂无章节</p>
          ) : (
            chapters.map((ch, i) => {
              const match = ch.match(/第(\d+)章/)
              const chapterNo = match ? parseInt(match[1]) : i + 1
              return (
                <button
                  key={i}
                  className="w-full text-left px-[8px] py-[3px] text-text-secondary text-[11px] font-ui hover:bg-bg-active hover:text-text-primary rounded-sm transition-colors truncate"
                  onClick={() => onChapterJump(chapterNo)}
                  data-testid="file-item"
                >
                  {ch}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

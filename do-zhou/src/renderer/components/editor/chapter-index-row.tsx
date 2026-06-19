import { type ChapterEntry } from '../../services/chapter-parser'

interface Props {
  entry: ChapterEntry
  onClick: (chapterNo: number) => void
}

export function ChapterIndexRow({ entry, onClick }: Props): React.ReactElement {
  const { number, title, exists } = entry

  return (
    <div
      className={`flex items-center gap-[24px] px-[16px] py-[12px] cursor-pointer transition-opacity hover:opacity-80 border-b border-border-default ${!exists ? 'opacity-40' : ''}`}
      onClick={() => exists ? onClick(number) : undefined}
      data-testid="chapter-row"
    >
      {/* 章节号 */}
      <span className="w-[80px] shrink-0 text-right text-text-secondary text-[14px] font-ui font-semibold">
        {!exists && <span className="mr-[4px]">⚠</span>}
        第{number}章
      </span>

      {/* 标题 */}
      <span className="flex-1 text-text-primary text-[16px] font-editor font-semibold truncate">
        {title}
      </span>

      {/* 箭头 */}
      <span className="text-text-tertiary text-[14px] shrink-0">
        →
      </span>
    </div>
  )
}

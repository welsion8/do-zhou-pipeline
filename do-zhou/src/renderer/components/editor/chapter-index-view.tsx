import { useMemo } from 'react'
import { ChapterIndexRow } from './chapter-index-row'
import { type ParseResult } from '../../services/chapter-parser'

interface Props {
  result: ParseResult
  onChapterClick: (chapterNo: number) => void
  onBack?: () => void
}

export function ChapterIndexView({ result, onChapterClick, onBack }: Props): React.ReactElement {
  const { entries, consistent, totalInIndex, totalFiles } = result

  const warning = useMemo(() => {
    if (!consistent) {
      return `章节索引声明 ${totalInIndex} 章，但 chapters/ 目录下仅有 ${totalFiles} 个文件`
    }
    return null
  }, [consistent, totalInIndex, totalFiles])

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      {/* 页头 */}
      <div className="shrink-0 flex items-center justify-between px-[32px] py-[16px] border-b border-border-default" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <div>
          <h2 className="text-text-primary text-[15px] font-ui font-semibold">📋 章节目录</h2>
          <p className="text-text-tertiary text-[11px] font-ui mt-[4px]">
            共 {totalInIndex} 章 · 点击跳转
          </p>
        </div>
        {onBack && (
          <button
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
            className="px-[10px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover transition-colors"
            onClick={onBack}
            data-testid="btn-back"
          >
            ← 返回工作台
          </button>
        )}
      </div>

      {/* 一致性警告 */}
      {warning && (
        <div className="shrink-0 mx-[16px] mt-[12px] px-[16px] py-[10px] rounded-md bg-[#2A2520] border border-[#F0A060]">
          <span className="text-[#F0A060] text-[12px] font-ui">⚠ {warning}</span>
        </div>
      )}

      {/* 章节列表 */}
      <div className="flex-1 overflow-y-auto">
        {entries.length === 0 ? (
          <div className="flex items-center justify-center h-full text-text-tertiary text-[12px] select-none">
            <p>暂无章节数据</p>
          </div>
        ) : (
          <div className="relative">
            {entries.map((entry) => (
              <ChapterIndexRow
                key={entry.number}
                entry={entry}
                onClick={onChapterClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useCallback } from 'react'
import { StageCardItem } from './stage-card-item'
import { type StageNavAPI } from '../../hooks/use-stage-navigation'

interface Props {
  api: StageNavAPI
  onToggleExpanded?: (expanded: boolean) => void
}

export function StageCards({ api, onToggleExpanded }: Props): React.ReactElement {
  const { stages, activeStage, expandedStage, chapters, handleStageClick, handleChapterJump } = api
  const [chapterJumpInput, setChapterJumpInput] = useState('')

  const handleClick = useCallback((id: string) => {
    handleStageClick(id as Parameters<typeof handleStageClick>[0])
    if (id === 'chapter_writing' && onToggleExpanded) {
      onToggleExpanded(expandedStage !== 'chapter_writing')
    }
  }, [handleStageClick, expandedStage, onToggleExpanded])

  return (
    <div className="space-y-[2px]">
      <p className="text-text-tertiary text-[11px] font-ui font-semibold px-[16px] pb-[4px]">📋 创作流程</p>
      {stages.map(stage => (
        <StageCardItem
          key={stage.id}
          stage={stage}
          isActive={activeStage === stage.id}
          isExpanded={expandedStage === stage.id}
          chapters={chapters}
          onClick={handleClick}
          onChapterJump={handleChapterJump}
          chapterJumpInput={chapterJumpInput}
          onChapterJumpInputChange={setChapterJumpInput}
        />
      ))}
    </div>
  )
}

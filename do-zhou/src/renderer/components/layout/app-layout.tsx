import { useState } from 'react'
import { Toolbar } from './toolbar'
import { StatusBar } from './status-bar'
import { LeftPanel } from './left-panel'
import { CenterPanel } from './center-panel'
import { RightPanel } from './right-panel'
import { ResizableDivider } from './resizable-divider'
import { FabButton } from './fab-button'
import { useResponsive } from '../../hooks/use-responsive'

const LEFT_DEF = 240; const LEFT_MIN = 180; const LEFT_MAX = 400
const RIGHT_DEF = 340; const RIGHT_MIN = 280; const RIGHT_MAX = 500

export function AppLayout({ activeProject, projectPath, activeSkill, selectedModel, onSelectModel, onOpenConfig, onOpenSettings, onHomeClick, onOpenFile, onChapterIndexClick, openTabs, activeTab, onSelectTab, onCloseTab }: {
  activeProject?: string | null; projectPath?: string | null; activeSkill?: string | null
  selectedModel?: string | null; onSelectModel?: (p: string, m: string) => void; onOpenConfig?: () => void
  onOpenSettings?: () => void; onHomeClick?: () => void
  onOpenFile?: (filePath: string) => void; onChapterIndexClick?: () => void
  openTabs?: string[]; activeTab?: string | null; onSelectTab?: (fp: string) => void; onCloseTab?: (fp: string) => void
}): React.ReactElement {
  const [lw, setLw] = useState(LEFT_DEF)
  const [rw, setRw] = useState(RIGHT_DEF)
  const [ro, setRo] = useState(false)
  const [lo, setLo] = useState(false)
  const { breakpoint, showLeftPanel, showRightPanel, leftPanelAsOverlay, rightPanelAsOverlay } = useResponsive()

  const alw = breakpoint === 'md' ? 220 : breakpoint === 'sm' ? 200 : lw
  const arw = breakpoint === 'lg' ? 280 : rw

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-bg-base">
      <Toolbar selectedModel={selectedModel ?? undefined} onSelectModel={onSelectModel} onOpenConfig={onOpenConfig} onOpenSettings={onOpenSettings} onHomeClick={onHomeClick} skillName={activeSkill ?? '通用'} projectName={activeProject ?? undefined} />
      <div className="flex-1 flex overflow-hidden">
        {showLeftPanel && !leftPanelAsOverlay && (
          <>
            <LeftPanel width={alw} activeProject={activeProject} projectPath={projectPath} onOpenFile={onOpenFile} onChapterIndexClick={onChapterIndexClick} />
            <ResizableDivider onResize={(d) => setLw(p => Math.min(LEFT_MAX, Math.max(LEFT_MIN, p + d)))} minSize={LEFT_MIN} maxSize={LEFT_MAX} />
          </>
        )}
        <CenterPanel openTabs={openTabs} activeTab={activeTab} onSelectTab={onSelectTab} onCloseTab={onCloseTab} />
        {showRightPanel && !rightPanelAsOverlay && (
          <>
            <ResizableDivider onResize={(d) => setRw(p => Math.min(RIGHT_MAX, Math.max(RIGHT_MIN, p - d)))} minSize={RIGHT_MIN} maxSize={RIGHT_MAX} />
            <RightPanel width={arw} projectPath={projectPath} activeSkill={activeSkill} />
          </>
        )}
      </div>
      <StatusBar />

      {leftPanelAsOverlay && lo && (
        <><div className="fixed inset-0 z-30 bg-black/50" onClick={() => setLo(false)} />
        <div className="fixed left-0 top-0 bottom-0 z-40 w-[240px] shadow-2xl"><LeftPanel width={240} activeProject={activeProject} projectPath={projectPath} onOpenFile={onOpenFile} onChapterIndexClick={onChapterIndexClick} /></div></>
      )}

      {rightPanelAsOverlay && (
        <>
          <FabButton onClick={() => setRo(p => !p)} visible={!ro} />
          {ro && <RightPanel width={arw} asOverlay onClose={() => setRo(false)} projectPath={projectPath} />}
        </>
      )}
    </div>
  )
}

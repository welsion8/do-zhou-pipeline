import { ChatView } from '../chat/chat-view'

export function RightPanel({ width, asOverlay, onClose, projectPath, activeSkill }: {
  width: number; asOverlay?: boolean; onClose?: () => void; projectPath?: string | null; activeSkill?: string | null
}): React.ReactElement {
  const panel = (
    <aside className="h-full bg-bg-panel border-l border-border-default flex flex-col overflow-hidden shrink-0" style={{ width }}>
      <ChatView projectRoot={projectPath ?? undefined} activeSkill={activeSkill} />
    </aside>
  )
  if (asOverlay) return <><div className="fixed inset-0 z-30 bg-black/50" onClick={onClose} /><div className="fixed right-0 top-0 bottom-0 z-40 shadow-2xl">{panel}</div></>
  return panel
}

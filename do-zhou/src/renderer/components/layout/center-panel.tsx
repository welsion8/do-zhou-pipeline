import { EditorWorkspace } from '../editor/editor-workspace'

export function CenterPanel({ openTabs, activeTab, onSelectTab, onCloseTab }: {
  openTabs?: string[]; activeTab?: string | null; onSelectTab?: (fp: string) => void; onCloseTab?: (fp: string) => void
}): React.ReactElement {
  return (
    <main className="flex-1 h-full bg-bg-editor flex flex-col overflow-hidden min-w-0">
      <EditorWorkspace openTabs={openTabs} activeTab={activeTab} onSelectTab={onSelectTab} onCloseTab={onCloseTab} />
    </main>
  )
}

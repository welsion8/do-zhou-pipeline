import { ShortcutPanel } from '../editor/shortcut-panel'

export function StatusBar(): React.ReactElement {
  return (
    <footer className="flex items-center justify-between h-[22px] bg-bg-panel border-t border-border-default px-[16px] shrink-0 text-[10px] font-ui select-none">
      <ShortcutPanel />
      <span className="text-text-tertiary">● 已自动保存</span>
      <span className="text-text-tertiary">行 12, 列 48</span>
    </footer>
  )
}

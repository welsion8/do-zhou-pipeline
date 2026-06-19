import { useState, useCallback } from 'react'
import { Home, ChevronDown } from 'lucide-react'
import { WindowControls } from '../window-controls'
import { ModelDropdown } from './model-dropdown'

interface ToolbarProps {
  onHomeClick?: () => void
  onOpenConfig?: () => void
  onOpenSettings?: () => void
  selectedModel?: string
  onSelectModel?: (providerId: string, modelId: string) => void
  skillName?: string
  projectName?: string
}

export function Toolbar({ onHomeClick, onOpenConfig, onOpenSettings, selectedModel, onSelectModel, skillName, projectName }: ToolbarProps): React.ReactElement {
  const [showDropdown, setShowDropdown] = useState(false)

  const handleSelectModel = useCallback((pid: string, mid: string) => {
    onSelectModel?.(pid, mid)
    setShowDropdown(false)
  }, [onSelectModel])

  const displayName = selectedModel || '未选择模型'

  return (
    <header className="flex items-center h-[48px] bg-bg-panel border-b border-border-default pl-[16px] pr-[120px] gap-[16px] shrink-0 select-none relative"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <button onClick={onHomeClick} className="text-text-secondary hover:text-text-primary transition-colors shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} aria-label="主页" data-testid="btn-home">
        <Home size={16} />
      </button>
      <nav className="flex items-center gap-[4px] text-[13px] shrink-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <span className="text-accent cursor-pointer hover:underline" onClick={onHomeClick}>{skillName || '通用'}</span>
        <span className="text-text-tertiary select-none">›</span>
        <span className="text-text-secondary select-none">{projectName || '未打开项目'}</span>
      </nav>
      <div className="flex-1" />
      <button
        className="flex items-center gap-[6px] px-[10px] py-[5px] rounded-sm bg-transparent border border-border-default text-[12px] hover:bg-bg-hover hover:border-border-hover transition-all duration-150 shrink-0"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        onClick={() => setShowDropdown(p => !p)}
        data-testid="btn-model-switch"
      >
        <span className="text-[11px]">🧠</span>
        <span className="text-text-secondary font-ui">{displayName}</span>
        <ChevronDown size={10} className="text-text-tertiary" />
      </button>
      {showDropdown && (
        <ModelDropdown
          onClose={() => setShowDropdown(false)}
          onSelectModel={handleSelectModel}
          onOpenConfig={() => onOpenConfig?.()}
          selectedModel={selectedModel}
        />
      )}
      <button onClick={onOpenSettings} className="text-text-tertiary hover:text-text-primary transition-colors shrink-0 ml-[4px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} aria-label="设置" title="设置" data-testid="btn-settings">
        <span className="text-[14px]">⚙</span>
      </button>
      {/* 设计帧 f7c4Zl: WinCtrl absolute 右侧 16px, 垂直居中 */}
      <div className="absolute right-[16px] top-1/2 -translate-y-1/2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <WindowControls />
      </div>
    </header>
  )
}

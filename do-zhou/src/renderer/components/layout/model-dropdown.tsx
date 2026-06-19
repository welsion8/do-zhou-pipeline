import { useEffect, useRef, useState } from 'react'
import type { ProviderData } from '../api-config/provider-card'

interface ModelDropdownProps {
  onClose: () => void
  onSelectModel: (providerId: string, modelId: string) => void
  onOpenConfig: () => void
  selectedModel?: string
}

export function ModelDropdown({ onClose, onSelectModel, onOpenConfig, selectedModel }: ModelDropdownProps): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const [providers, setProviders] = useState<ProviderData[]>([])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])

  useEffect(() => {
    const api = window.electronAPI?.apiConfig
    if (!api) return
    api.getAll().then(list => setProviders(list.filter(p => p.enabled && p.models.length > 0)))
  }, [])

  return (
    <div ref={ref} className="absolute top-[44px] right-[120px] z-50 w-[260px] bg-bg-panel border border-border-default rounded-md shadow-lg py-[4px] max-h-[400px] overflow-y-auto"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
      {providers.length === 0 && (
        <div className="px-[16px] py-[12px] text-text-tertiary text-[12px] text-center">
          <p>暂无已配置的模型</p>
          <button className="mt-[8px] text-accent hover:underline text-[12px]" onClick={() => { onOpenConfig(); onClose() }}>前往配置 API →</button>
        </div>
      )}
      {providers.map(p => (
        <div key={p.id}>
          <div className="px-[16px] py-[6px] text-text-tertiary text-[10px] font-ui font-semibold uppercase tracking-wider">
            {p.name}
          </div>
          {p.models.map(m => (
            <div
              key={`${p.id}:${m}`}
              className={`px-[16px] py-[8px] text-[13px] cursor-pointer hover:bg-bg-active transition-colors flex items-center gap-[8px] ${selectedModel === `${p.id}:${m}` ? 'text-accent font-semibold' : 'text-text-primary'}`}
              onClick={() => { onSelectModel(p.id, m); onClose() }}
              data-testid="model-option"
            >
              <span className="w-[6px] h-[6px] rounded-full bg-green-500/70 shrink-0" />
              {m}
            </div>
          ))}
        </div>
      ))}
      <div className="border-t border-border-default mt-[4px] pt-[4px]">
        <div className="px-[16px] py-[8px] text-[12px] text-text-secondary cursor-pointer hover:bg-bg-active transition-colors"
          onClick={() => { onOpenConfig(); onClose() }}>
          ⚙ 管理 API 配置...
        </div>
      </div>
    </div>
  )
}

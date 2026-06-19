import { useState, useCallback, useEffect, useRef } from 'react'

export interface ProviderData {
  id: string; name: string; apiUrl: string; apiKey: string; models: string[]
  enabled: boolean; order: number; isBuiltin: boolean
}

interface ProviderCardProps {
  provider: ProviderData
  onUpdate: (id: string, u: { apiUrl?: string; apiKey?: string; enabled?: boolean; name?: string }) => void
  onDelete: (id: string) => void
  onFetchModels: (id: string) => Promise<void>
  onTestConnection: (id: string) => Promise<boolean>
  onDragStart: (e: React.DragEvent, id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void
  onDragEnd: () => void
  defaultModel?: string
  onSetDefault?: (id: string, modelId: string) => void
}

function modelDesc(modelId: string): string {
  const lower = modelId.toLowerCase()
  if (lower.includes('opus') || lower.includes('v4-pro')) return '旗舰'
  if (lower.includes('sonnet')) return '均衡'
  if (lower.includes('haiku') || lower.includes('v4-flash')) return '轻量'
  if (lower.includes('gpt-4o') && lower.includes('mini')) return '轻量'
  if (lower.includes('gpt-4o') || lower.includes('gpt-4')) return '旗舰'
  if (lower.includes('8k')) return '8K'
  if (lower.includes('32k')) return '32K'
  if (lower.includes('128k')) return '128K'
  if (lower.includes('flash') && lower.includes('glm')) return '轻量'
  if (lower.includes('glm-4')) return '旗舰'
  if (lower.includes('max')) return '旗舰'; if (lower.includes('plus')) return '均衡'; if (lower.includes('turbo')) return '轻量'
  if (lower.includes('pro')) return '旗舰'
  if (lower.includes('flash') || lower.includes('mini') || lower.includes('lite')) return '轻量'
  if (lower.includes('coder') || lower.includes('code')) return '代码'
  if (lower.includes('chat')) return '通用'
  return ''
}

export function ProviderCard({
  provider, onUpdate, onDelete, onFetchModels, onTestConnection, onDragStart, onDragOver, onDragEnd,
  defaultModel, onSetDefault,
}: ProviderCardProps): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const [url, setUrl] = useState(provider.apiUrl)
  const [key, setKey] = useState(provider.apiKey || '')
  const [fetching, setFetching] = useState(false)
  const [testing, setTesting] = useState(false)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const urlRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setUrl(provider.apiUrl) }, [provider.apiUrl])
  useEffect(() => { if (!key) setKey(provider.apiKey || '') }, [provider.apiKey]) // eslint-disable-line
  // 展开时自动聚焦到 API 地址输入框
  useEffect(() => { if (expanded) { const t = setTimeout(() => urlRef.current?.focus(), 150); return () => clearTimeout(t) } }, [expanded])

  const modelCount = provider.models.length
  const defModel = defaultModel || provider.models[0]
  const statusColor = !provider.enabled ? '#5C5B60'
    : connected === true ? '#4A6B4A'
    : connected === false ? '#E57373'
    : modelCount > 0 ? '#4A6B4A'
    : '#5C5B60'

  const handleFetch = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setFetching(true)
    try { onUpdate(provider.id, { apiUrl: url, apiKey: key }); await onFetchModels(provider.id) } catch (_) {}
    setFetching(false)
  }, [provider.id, url, key, onUpdate, onFetchModels])

  const handleTest = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    setTesting(true); setConnected(null)
    onUpdate(provider.id, { apiUrl: url, apiKey: key })
    const ok = await onTestConnection(provider.id)
    setConnected(ok); setTesting(false)
  }, [provider.id, url, key, onUpdate, onTestConnection])

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onUpdate(provider.id, { apiUrl: url, apiKey: key })
    // 保存成功反馈——按钮短暂显示"已保存"后保持展开
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }, [provider.id, url, key, onUpdate])

  const ghostBtn = 'px-[10px] py-[4px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[11px] hover:bg-bg-active transition-colors'

  return (
    <div
      className={`rounded-md border transition-all duration-200 ${expanded ? 'bg-bg-panel border-border-hover shadow-sm' : 'bg-bg-base border-border-default hover:border-border-hover hover:shadow-sm'}`}
      draggable
      onDragStart={e => onDragStart(e, provider.id)}
      onDragOver={e => onDragOver(e, provider.id)}
      onDragEnd={onDragEnd}
      data-testid="provider-card"
    >
      {/* 提供商头部 */}
      <div className="flex items-center justify-between p-[16px] cursor-pointer select-none gap-[8px]"
        onClick={() => setExpanded(p => !p)}>
        <div className="flex items-center gap-[8px]">
          <span className="text-text-tertiary text-[12px] cursor-grab active:cursor-grabbing">⋮⋮</span>
          <span className="text-text-primary text-[14px] font-ui font-semibold">{provider.name}</span>
          <span className="w-[8px] h-[8px] rounded-full shrink-0 transition-colors duration-300" style={{ background: statusColor }} />
          {saved && <span className="text-[10px] text-green-500 animate-pulse">已保存</span>}
        </div>
        <div className="flex items-center gap-[8px] shrink-0">
          {modelCount > 0 && <span className="text-text-secondary text-[11px]">{modelCount}个 ✓</span>}
          {defModel && <span className="text-text-tertiary text-[11px]">默认: {defModel}</span>}
          <button className={ghostBtn} onClick={e => { e.stopPropagation(); onUpdate(provider.id, { enabled: !provider.enabled }) }}>
            {provider.enabled ? '断开' : '启用'}
          </button>
          {defModel && onSetDefault && (
            <button className={ghostBtn} onClick={e => { e.stopPropagation(); onSetDefault(provider.id, defModel) }}>设为默认</button>
          )}
          {!expanded && (
            <button className="flex items-center gap-[4px] px-[8px] py-[3px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[11px] hover:bg-bg-active transition-colors disabled:opacity-30"
              onClick={handleFetch} disabled={fetching}>
              {fetching ? <><span className="inline-block w-[12px] h-[12px] border-2 border-text-tertiary border-t-accent rounded-full animate-spin" /> 拉取中</> : <>🔍 拉取模型</>}
            </button>
          )}
        </div>
      </div>

      {/* 展开编辑区 —— 动画展开，内容不截断 */}
      <div className={`grid transition-all duration-250 ease-out ${expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
        <div className="px-[24px] pt-[8px] pb-[16px] flex flex-col gap-[8px]">
          {/* API 地址行 */}
          <div className="flex items-center gap-[8px]">
            <span className="text-text-tertiary text-[11px] w-[60px] shrink-0">API 地址</span>
            <input ref={urlRef} className="flex-1 px-[12px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] outline-none focus:border-border-hover transition-colors"
              value={url} onChange={e => setUrl(e.target.value)} />
            <button className={`px-[12px] py-[4px] rounded-sm bg-transparent border border-border-default text-[11px] hover:bg-bg-active transition-all duration-200 ${testing ? 'border-accent-dim text-accent' : 'text-text-secondary'} disabled:opacity-50`}
              onClick={handleTest} disabled={testing} data-testid="btn-check-connection">
              {testing ? <span className="inline-block w-[12px] h-[12px] border-2 border-text-tertiary border-t-accent rounded-full animate-spin" /> : '🔍'}
            </button>
          </div>

          {/* Key 行 */}
          <div className="flex items-center gap-[8px]">
            <span className="text-text-tertiary text-[11px] w-[60px] shrink-0">API Key</span>
            <input className="flex-1 px-[12px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] outline-none focus:border-border-hover transition-colors"
              type={showKey ? 'text' : 'password'} value={key} onChange={e => setKey(e.target.value)}
              placeholder={provider.apiKey ? '••••••••••••' : '输入 API Key'} />
            <button className="text-text-tertiary text-[14px] hover:text-text-secondary shrink-0" onClick={() => setShowKey(!showKey)}>
              {showKey ? '🙈' : '👁'}
            </button>
          </div>

          {/* 连接状态反馈 */}
          {connected !== null && (
            <div className={`flex items-center gap-[8px] pl-[60px] animate-in fade-in duration-200 ${connected ? 'text-green-500' : 'text-red-500'}`}>
              <span className="text-[12px]">{connected ? '✓ 连接成功' : '✗ 连接失败'}</span>
              {connected && modelCount === 0 && <span className="text-text-tertiary text-[11px]">点击 🔍 拉取模型列表</span>}
            </div>
          )}

          {/* 模型列表 */}
          {modelCount > 0 && (
            <>
              <div className="flex items-center gap-[8px] pt-[4px] pl-[60px]">
                <span className="text-text-tertiary text-[11px]">可用模型:</span>
                <span className="text-[10px]" style={{ color: '#4A6B4A' }}>✅ 已获取</span>
              </div>
              {provider.models.map(m => {
                const isDefault = m === defModel
                const desc = modelDesc(m)
                return (
                  <div key={m} className="flex items-center gap-[8px] pl-[60px] py-[2px] group">
                    <span className="text-[10px] shrink-0" style={{ color: isDefault ? 'var(--color-accent)' : 'var(--color-text-tertiary)' }}>
                      {isDefault ? '●' : '○'}
                    </span>
                    <span className={`text-[12px] ${isDefault ? 'text-text-primary' : 'text-text-secondary'}`}>{m}</span>
                    {desc && (
                      <span className="text-text-tertiary text-[11px]">
                        {desc}{isDefault ? ' · [默认]' : ''}
                      </span>
                    )}
                    {!isDefault && onSetDefault && (
                      <button className="text-text-tertiary text-[10px] hover:text-accent ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); onSetDefault(provider.id, m) }}>设为默认</button>
                    )}
                  </div>
                )
              })}
            </>
          )}

          {/* 保存按钮行 */}
          <div className="flex justify-end gap-[8px] pt-[8px] pl-[60px]">
            <button className="px-[14px] py-[5px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-active transition-colors"
              onClick={e => { e.stopPropagation(); setExpanded(false) }}>取消</button>
            <button className={`px-[14px] py-[5px] rounded-sm border text-[12px] transition-all duration-200 ${saved ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-bg-active border-border-hover text-text-primary hover:bg-bg-hover'}`}
              onClick={handleSave}>{saved ? '✓ 已保存' : '💾 保存'}</button>
            {!provider.isBuiltin && (
              <button className="px-[14px] py-[5px] rounded-sm bg-transparent border border-[#E57373] text-[#E57373] text-[12px] hover:bg-[#3D2020] transition-colors"
                onClick={e => { e.stopPropagation(); onDelete(provider.id) }}>删除</button>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

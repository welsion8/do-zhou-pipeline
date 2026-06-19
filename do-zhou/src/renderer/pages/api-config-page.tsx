import { useState, useEffect, useCallback, useRef } from 'react'
import { ProviderCard, type ProviderData } from '../components/api-config/provider-card'
import { WindowControls } from '../components/window-controls'

export function ApiConfigPage({ onBack }: { onBack?: () => void }): React.ReactElement {
  const [providers, setProviders] = useState<ProviderData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newKey, setNewKey] = useState('')
  const dragId = useRef<string | null>(null)

  const api = window.electronAPI?.apiConfig

  const load = useCallback(async () => {
    if (!api) { setLoading(false); return }
    setLoading(true)
    try { const list = await api.getAll(); setProviders(list.sort((a, b) => a.order - b.order)); setError(null) } catch (_) { setProviders([]); setError('无法加载 API 配置，请检查数据目录权限') }
    setLoading(false)
  }, [api])
  useEffect(() => { load() }, [load])

  const handleUpdate = useCallback(async (id: string, u: Record<string, unknown>) => { if (!api) return; await api.update(id, u); load() }, [api, load])
  const handleDelete = useCallback(async (id: string) => { if (!api) return; await api.delete(id); load() }, [api, load])
  const handleFetch = useCallback(async (id: string) => { if (!api) return; await api.fetchModels(id); load() }, [api, load])
  const handleTest = useCallback(async (id: string): Promise<boolean> => { if (!api) return false; return api.testConnection(id) }, [api])
  const handleAdd = useCallback(async () => { if (!api || !newName || !newUrl) return; await api.addCustom(newName, newUrl, newKey); setNewName(''); setNewUrl(''); setNewKey(''); setShowAdd(false); load() }, [api, newName, newUrl, newKey, load])
  const handleReorder = useCallback(async (ids: string[]) => { if (!api) return; await api.reorder(ids); load() }, [api, load])

  const onDragStart = useCallback((_e: React.DragEvent, id: string) => { dragId.current = id }, [])
  const onDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move'
    if (!dragId.current || dragId.current === id) return
    setProviders(prev => {
      const from = prev.findIndex(p => p.id === dragId.current), to = prev.findIndex(p => p.id === id)
      if (from === -1 || to === -1) return prev
      const next = [...prev]; next.splice(to, 0, next.splice(from, 1)[0]); return next
    })
  }, [])
  const onDragEnd = useCallback(() => { if (!dragId.current) return; handleReorder(providers.map(p => p.id)); dragId.current = null }, [providers, handleReorder])

  if (loading) return <div className="h-full flex items-center justify-center text-text-tertiary text-[13px]">加载中...</div>

  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
      {/* w6Kty 页头: padding=[24,32], bottom border. drag region 使无边框窗口可拖拽 */}
      <div className="shrink-0 flex items-center justify-between px-[32px] py-[24px] border-b border-border-default bg-bg-base"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h1 className="text-text-primary text-[16px] font-ui font-semibold">⚙ API 模型配置</h1>
        <div className="flex items-center gap-[12px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <p className="text-text-tertiary text-[12px]">💡 拖拽调整优先级，排越前默认首选</p>
          {onBack && <button className="px-[10px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover transition-colors" onClick={onBack}>← 返回工作台</button>}
        </div>
        {/* 设计帧 EA2KT: 窗口控制在右侧, 自适应窗口宽度 */}
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="ml-auto mr-[20px] flex items-center">
          <WindowControls />
        </div>
      </div>

      {/* nSx58 API内容区 */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-[32px] py-[24px] flex flex-col gap-[16px]">
          {/* 加载态: skeleton */}
          {loading && (
            <div className="flex flex-col gap-[16px]">
              {[1,2,3].map(i => <div key={i} className="h-[120px] bg-bg-active animate-pulse rounded-md" />)}
            </div>
          )}
          {/* 错误态: 按模板 #2A2520/#F0A060 */}
          {error && (
            <div className="flex items-center justify-between px-[16px] py-[10px] rounded-md bg-[#2A2520] border border-[#F0A060]">
              <span className="text-[#F0A060] text-[12px] font-ui">⚠ {error}</span>
              <button className="text-[#F0A060] text-[14px] hover:opacity-80" onClick={() => { setError(null); load() }}>↻ 重试</button>
            </div>
          )}
          {!loading && !error && providers.map(p => (
            <ProviderCard key={p.id} provider={p} onUpdate={handleUpdate} onDelete={handleDelete} onFetchModels={handleFetch} onTestConnection={handleTest} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd} />
          ))}

          {/* pTJ5i 添加提供商栏: border top 1px, padding=[$spacing-sm,0]=[8,0], gap=$spacing-sm=8 */}
          <div className="flex items-center gap-[8px] border-t border-border-default pt-[8px] flex-wrap">
            <span className="text-text-tertiary text-[12px]">+ 添加</span>
            {['自定义', 'Claude', 'Kimi', 'GLM', 'MiniMax', 'DeepSeek', 'Qwen', 'OpenRouter'].map(l => (
              <button key={l} className="px-[10px] py-[3px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-active transition-colors" onClick={() => setShowAdd(true)}>{l}</button>
            ))}
          </div>

          {showAdd && (
            <div className="bg-bg-panel border border-border-default rounded-md p-[16px] flex flex-col gap-[8px]">
              <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-border-hover" placeholder="提供商名称" value={newName} onChange={e => setNewName(e.target.value)} />
              <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-border-hover" placeholder="API 地址" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
              <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-border-hover" type="password" placeholder="API Key" value={newKey} onChange={e => setNewKey(e.target.value)} />
              <div className="flex gap-[8px]">
                <button className="px-[10px] py-[3px] rounded-sm bg-accent-dim/20 border border-accent-dim text-accent text-[12px] hover:bg-accent-dim/30" onClick={handleAdd} data-testid="modal-confirm">添加</button>
                <button className="px-[10px] py-[3px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" onClick={() => setShowAdd(false)} data-testid="modal-cancel">取消</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

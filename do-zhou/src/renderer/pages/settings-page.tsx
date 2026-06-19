import { useState, useEffect } from 'react'
import { DropdownSelect } from '../components/ui/dropdown-select'
import { Slider } from '../components/ui/slider'
import { ToggleSwitch } from '../components/ui/toggle-switch'
import { WindowControls } from '../components/window-controls'

interface Props { onBack: () => void; onOpenApiConfig?: () => void }

type TabId = 'editor' | 'appearance' | 'ai' | 'api-config' | 'data'
const TABS: { id: TabId; label: string }[] = [
  { id: 'editor', label: '编辑器' }, { id: 'appearance', label: '外观' },
  { id: 'ai', label: 'AI 默认' }, { id: 'api-config', label: 'API 配置' },
  { id: 'data', label: '数据' },
]

export function SettingsPage({ onBack, onOpenApiConfig }: Props): React.ReactElement {
  const [tab, setTab] = useState<TabId>('editor')
  const [fontSize, setFontSize] = useState(14)
  const [lineHeight, setLineHeight] = useState(1.7)
  const [autoSave, setAutoSave] = useState(2)
  const [tabWidth, setTabWidth] = useState(80)
  const [editorWidth, setEditorWidth] = useState(0)
  const [theme, setTheme] = useState('dark')
  const [accent, setAccent] = useState('#6B7A8A')
  const [language, setLanguage] = useState('zh-CN')
  const [defaultProvider, setDefaultProvider] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [streamOutput, setStreamOutput] = useState(true)
  const [maxTokens, setMaxTokens] = useState(4096)
  const [autoBackup, setAutoBackup] = useState(true)
  const [backupCount, setBackupCount] = useState(5)

  // 加载已有设置
  useEffect(() => { window.electronAPI?.settings?.get().then((s: any) => {
    if (!s?.editor) return
    setFontSize(s.editor.fontSize); setLineHeight(s.editor.lineHeight)
    setAutoSave(s.editor.autoSaveInterval); setTabWidth(s.editor.tabWidth)
    setTheme(s.appearance?.theme); setAccent(s.appearance?.accentColor)
    setDefaultProvider(s.ai?.defaultProvider); setDefaultModel(s.ai?.defaultModel)
    setStreamOutput(s.ai?.streamOutput); setMaxTokens(s.ai?.maxTokens)
    setAutoBackup(s.data?.autoBackup); setBackupCount(s.data?.backupCount)
  }).catch(()=>{}) }, [])

  // 自动保存
  const save = () => window.electronAPI?.settings?.save({
    editor: { fontFamily: 'ui-sans-serif', fontSize, lineHeight, autoSaveInterval: autoSave, tabWidth, editorWidth },
    appearance: { theme, accentColor: accent, language },
    ai: { defaultProvider, defaultModel, streamOutput, maxTokens },
    data: { dataRoot: '', autoBackup, backupCount, backupDir: '' },
  })

  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
      <div className="shrink-0 flex items-center px-[24px] py-[24px] border-b border-border-default bg-bg-panel" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <button className="px-[10px] py-[4px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} onClick={() => { save(); onBack() }}>← 返回</button>
        <h1 className="ml-[12px] text-text-primary text-[15px] font-ui font-semibold">⚙ 设置</h1>
        <div className="flex-1" />
        <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="ml-auto mr-[20px] flex items-center">
          <WindowControls />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* 标签导航 */}
        <div className="w-[200px] shrink-0 bg-bg-panel border-r border-border-default p-[24px] flex flex-col gap-[2px]">
          {TABS.map(t => (
            <button key={t.id} className={`text-left px-[16px] py-[8px] rounded-sm text-[13px] transition-colors ${tab === t.id ? 'bg-bg-active text-text-primary' : 'text-text-secondary hover:bg-bg-active hover:text-text-primary'}`}
              onClick={() => setTab(t.id)} data-testid="settings-tab">{t.label}</button>
          ))}
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-[32px]">
          <div className="max-w-[480px] flex flex-col gap-[20px]">
            {tab === 'editor' && (
              <>
                <Slider label="字号" value={fontSize} min={11} max={24} onChange={setFontSize} />
                <Slider label="行高" value={lineHeight} min={1.2} max={2.5} step={0.1} onChange={setLineHeight} />
                <Slider label="Tab 宽度" value={tabWidth} min={40} max={200} step={10} onChange={setTabWidth} />
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px]">自动保存间隔（秒）</span>
                  <DropdownSelect value={String(autoSave)} options={['2','5','10','30','60'].map(v=>({value:v,label:v+'s'}))} onChange={v=>setAutoSave(Number(v))} />
                </div>
              </>
            )}

            {tab === 'appearance' && (
              <>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px]">主题</span>
                  <DropdownSelect value={theme} options={[{value:'dark',label:'深色'},{value:'light',label:'浅色'},{value:'system',label:'跟随系统'}]} onChange={setTheme} />
                </div>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px]">语言</span>
                  <DropdownSelect value={language} options={[{value:'zh-CN',label:'简体中文'},{value:'en',label:'English'}]} onChange={setLanguage} />
                </div>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px]">强调色</span>
                  <div className="flex items-center gap-[8px]"><input type="color" value={accent} onChange={e=>setAccent(e.target.value)} className="w-[32px] h-[32px] rounded-sm border-0 cursor-pointer" /><span className="text-text-secondary text-[12px]">{accent}</span></div>
                </div>
              </>
            )}

            {tab === 'ai' && (
              <>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px]">默认提供商</span>
                  <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-accent-dim" value={defaultProvider} onChange={e=>setDefaultProvider(e.target.value)} placeholder="如：Claude, DeepSeek" />
                </div>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px]">默认模型</span>
                  <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-accent-dim" value={defaultModel} onChange={e=>setDefaultModel(e.target.value)} placeholder="如：claude-sonnet-4-6" />
                </div>
                <ToggleSwitch label="流式输出" checked={streamOutput} onChange={setStreamOutput} />
                <Slider label="最大 Token" value={maxTokens} min={512} max={32000} step={512} onChange={setMaxTokens} />
              </>
            )}

            {tab === 'api-config' && (
              <div className="flex flex-col items-center justify-center py-[48px] gap-[12px]">
                <p className="text-text-tertiary text-[13px]">API 密钥和模型配置在独立页面中管理</p>
                <button className="px-[16px] py-[8px] rounded-md bg-accent-dim/20 border border-accent-dim text-accent text-[13px] hover:bg-accent-dim/30" onClick={() => onOpenApiConfig?.()}>⚙ 打开 API 配置页面</button>
              </div>
            )}

            {tab === 'data' && (
              <>
                <ToggleSwitch label="自动备份" checked={autoBackup} onChange={setAutoBackup} />
                <Slider label="备份保留份数" value={backupCount} min={1} max={20} onChange={setBackupCount} />
                <button className="px-[12px] py-[6px] rounded-sm bg-accent-dim/20 border border-accent-dim text-accent text-[12px] hover:bg-accent-dim/30 self-start">📦 手动备份</button>
                <button className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover self-start">📂 恢复备份</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

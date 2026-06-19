import { useState, useEffect } from 'react'
import { WindowControls } from '../components/window-controls'

interface Props { skillId?: string; onBack: () => void }

type TabId = 'basic' | 'agent' | 'method' | 'style' | 'templates' | 'examples'

export function SkillEditorPage({ skillId, onBack }: Props): React.ReactElement {
  const isNew = skillId === '__new__'
  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [skillName, setSkillName] = useState('')
  const [skillVersion, setSkillVersion] = useState('1.0')
  const [skillCategory, setSkillCategory] = useState('')
  const [stages, setStages] = useState<string[]>(['故事大纲', '人物小传', '章节目录', '章节写作'])
  const [newStage, setNewStage] = useState('')
  const [agentPrompt, setAgentPrompt] = useState('')
  const [methodContent, setMethodContent] = useState('')
  const [styleContent, setStyleContent] = useState('')
  const [saved, setSaved] = useState(false)
  const [templateFiles] = useState(['大纲模板', '人物模板', '目录模板', '章节模板'])
  const [exampleFiles] = useState(['大纲示例', '人物示例', '章节示例'])
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [selectedExample, setSelectedExample] = useState('')

  // 加载已有 Skill 内容
  useEffect(() => {
    if (isNew || !skillId) return
    (async () => {
      const base = await window.electronAPI?.app?.getDataRoot?.().catch(() => '') || ''
      const sp = `${base}/skills/${skillId}/${skillId}-skills`
      const claude = await window.electronAPI?.tool?.readFile(`${base}/skills/${skillId}/CLAUDE.md`) || ''
      const method = await window.electronAPI?.tool?.readFile(`${sp}/outline-method.md`) || ''
      const style = await window.electronAPI?.tool?.readFile(`${sp}/output-style.md`) || ''
      if (claude) setAgentPrompt(claude)
      if (method) setMethodContent(method)
      if (style) setStyleContent(style)
      setSkillName(skillId)
    })()
  }, [skillId, isNew])

  const handleSave = async () => {
    if (!skillName) return
    if (isNew) await window.electronAPI?.skill?.create(skillName, skillCategory, stages)
    else if (skillId) {
      const base = await window.electronAPI?.app?.getDataRoot?.().catch(() => '') || ''
      const sr = `${base}/skills/${skillId}`
      const sp = `${sr}/${skillId}-skills`
      await window.electronAPI?.tool?.writeFile(`${sr}/CLAUDE.md`, agentPrompt)
      await window.electronAPI?.tool?.writeFile(`${sp}/outline-method.md`, methodContent)
      await window.electronAPI?.tool?.writeFile(`${sp}/output-style.md`, styleContent)
    }
    setSaved(true); setTimeout(() => onBack(), 500)
  }

  const addStage = () => { if (newStage && !stages.includes(newStage)) { setStages([...stages, newStage]); setNewStage('') } }

  const tabBtn = (id: TabId, label: string, icon: string) => (
    <button key={id} className={`text-left px-[16px] py-[8px] rounded-sm text-[13px] font-ui transition-colors w-full ${activeTab === id ? 'bg-bg-active text-text-primary' : 'bg-transparent text-text-secondary hover:bg-bg-active hover:text-text-primary'}`}
      onClick={() => setActiveTab(id)}>{icon} {label}</button>
  )

  return (
    <div className="h-screen flex flex-col bg-bg-base overflow-hidden">
      {/* ═══ SK页头 (jjYaS→t2E4V: padding=[24,32], WinCtrl absolute) ═══ */}
      <div className="shrink-0 flex items-center justify-between bg-bg-panel border-b border-border-default px-[32px] py-[24px] relative"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
        <h1 className="text-text-primary text-[15px] font-ui font-semibold">
          {isNew ? '⚙ 新建技能包' : `⚙ 编辑技能包: ${skillName}`}
        </h1>
        <div className="flex items-center gap-[8px]" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button className="px-[14px] py-[5px] rounded-sm bg-transparent border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" onClick={onBack}>取消</button>
          <button className={`px-[14px] py-[5px] rounded-sm border text-[12px] font-ui transition-colors ${saved ? 'bg-accent-dim/20 border-accent-dim/30 text-accent' : 'bg-accent-dim/30 border-accent-dim text-accent hover:bg-accent-dim/40'}`} onClick={handleSave}>
            {saved ? '✓ 已保存' : '保存'}
          </button>
        </div>
        <div className="absolute right-0 top-0" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <WindowControls />
        </div>
      </div>

      {/* ═══ SKBody (jjYaS→P0xe4: SKTabNav 190px + SKTabContent fill) ═══ */}
      <div className="flex-1 flex overflow-hidden">
        {/* SKTabNav (jjYaS→MOWTZ: width=190, padding=16, gap=2, vertical) */}
        <div className="w-[190px] shrink-0 bg-bg-panel border-r border-border-default p-[16px] flex flex-col gap-[2px]">
          {tabBtn('basic', '基本信息', '📋')}
          {tabBtn('agent', 'Agent 提示词', '🤖')}
          {tabBtn('method', '写作方法论', '📝')}
          {tabBtn('style', '输出风格', '🎨')}
          {tabBtn('templates', '模板', '📄')}
          {tabBtn('examples', '示例', '📖')}
        </div>

        {/* SKTabContent (jjYaS→g3le0x: padding=24 left, clip) */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[600px] py-[24px] pl-[32px] pr-[24px]">

            {activeTab === 'basic' && (
              <div className="flex flex-col gap-[16px]">
                <h2 className="text-text-primary text-[16px] font-ui font-semibold mb-[4px]">📋 基本信息</h2>
                <label className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px] font-ui">技能包名称</span>
                  <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-accent-dim" value={skillName} onChange={e => setSkillName(e.target.value)} placeholder="如：现代言情" />
                </label>
                <label className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px] font-ui">版本号</span>
                  <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-accent-dim" value={skillVersion} onChange={e => setSkillVersion(e.target.value)} />
                </label>
                <label className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px] font-ui">题材描述</span>
                  <input className="px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-accent-dim" value={skillCategory} onChange={e => setSkillCategory(e.target.value)} placeholder="如：言情、悬疑、科幻" />
                </label>
                <div className="flex flex-col gap-[4px]">
                  <span className="text-text-tertiary text-[12px] font-ui">工作阶段</span>
                  {stages.map((s, i) => (
                    <div key={i} className="flex items-center gap-[8px] px-[12px] py-[6px] bg-bg-active rounded-sm border border-border-default">
                      <span className="flex-1 text-text-primary text-[13px]">{i + 1}. {s}</span>
                      <button className="text-text-tertiary text-[11px] hover:text-[#E57373]" onClick={() => setStages(stages.filter((_, j) => j !== i))}>×</button>
                    </div>
                  ))}
                  <div className="flex gap-[4px]">
                    <input className="flex-1 px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] outline-none focus:border-accent-dim" value={newStage} onChange={e => setNewStage(e.target.value)} onKeyDown={e => e.key === 'Enter' && addStage()} placeholder="新阶段名称" />
                    <button className="px-[10px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-secondary text-[12px] hover:bg-bg-hover" onClick={addStage}>添加</button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'agent' && (
              <div className="flex flex-col gap-[8px]">
                <h2 className="text-text-primary text-[16px] font-ui font-semibold mb-[4px]">🤖 Agent 提示词</h2>
                <p className="text-text-tertiary text-[12px]">定义 Agent 角色、任务、工作流（对应 CLAUDE.md）</p>
                <textarea className="h-[400px] px-[12px] py-[8px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] font-mono outline-none focus:border-accent-dim resize-none" value={agentPrompt} onChange={e => setAgentPrompt(e.target.value)} placeholder="定义 Agent 角色、任务、工作流..." />
              </div>
            )}

            {activeTab === 'method' && (
              <div className="flex flex-col gap-[8px]">
                <h2 className="text-text-primary text-[16px] font-ui font-semibold mb-[4px]">📝 写作方法论</h2>
                <p className="text-text-tertiary text-[12px]">该题材的创作方法论和指导原则（对应 outline-method.md）</p>
                <textarea className="h-[400px] px-[12px] py-[8px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] font-mono outline-none focus:border-accent-dim resize-none" value={methodContent} onChange={e => setMethodContent(e.target.value)} placeholder="写作方法论..." />
              </div>
            )}

            {activeTab === 'style' && (
              <div className="flex flex-col gap-[8px]">
                <h2 className="text-text-primary text-[16px] font-ui font-semibold mb-[4px]">🎨 输出风格</h2>
                <p className="text-text-tertiary text-[12px]">写作风格、语言规范、禁忌（对应 output-style.md）</p>
                <textarea className="h-[400px] px-[12px] py-[8px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] font-mono outline-none focus:border-accent-dim resize-none" value={styleContent} onChange={e => setStyleContent(e.target.value)} placeholder="输出风格定义..." />
              </div>
            )}

            {activeTab === 'templates' && (
              <div className="flex flex-col gap-[8px]">
                <h2 className="text-text-primary text-[16px] font-ui font-semibold mb-[4px]">📄 模板</h2>
                <div className="flex gap-[16px]">
                  <div className="w-[200px] shrink-0 border border-border-default rounded-sm p-[8px] bg-bg-panel flex flex-col gap-[2px]">
                    <p className="text-text-tertiary text-[11px] mb-[4px]">模板文件</p>
                    {templateFiles.map(t => (
                      <div key={t} className={`px-[8px] py-[4px] text-[12px] rounded-sm cursor-pointer ${selectedTemplate === t ? 'bg-bg-active text-text-primary' : 'text-text-secondary hover:bg-bg-active'}`} onClick={() => setSelectedTemplate(t)}>{t}</div>
                    ))}
                  </div>
                  <div className="flex-1 border border-border-default rounded-sm p-[16px] bg-bg-panel min-h-[300px]">
                    {selectedTemplate ? (
                      <p className="text-text-secondary text-[13px]">📝 预览和编辑: {selectedTemplate}</p>
                    ) : (
                      <p className="text-text-tertiary text-[12px]">选择左侧模板文件进行预览和编辑</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'examples' && (
              <div className="flex flex-col gap-[8px]">
                <h2 className="text-text-primary text-[16px] font-ui font-semibold mb-[4px]">📖 示例</h2>
                <div className="flex gap-[16px]">
                  <div className="w-[200px] shrink-0 border border-border-default rounded-sm p-[8px] bg-bg-panel flex flex-col gap-[2px]">
                    <p className="text-text-tertiary text-[11px] mb-[4px]">示例文件</p>
                    {exampleFiles.map(t => (
                      <div key={t} className={`px-[8px] py-[4px] text-[12px] rounded-sm cursor-pointer ${selectedExample === t ? 'bg-bg-active text-text-primary' : 'text-text-secondary hover:bg-bg-active'}`} onClick={() => setSelectedExample(t)}>{t}</div>
                    ))}
                  </div>
                  <div className="flex-1 border border-border-default rounded-sm p-[16px] bg-bg-panel min-h-[300px]">
                    {selectedExample ? (
                      <p className="text-text-tertiary text-[12px]">📖 只读预览: {selectedExample}</p>
                    ) : (
                      <p className="text-text-tertiary text-[12px]">选择左侧示例文件进行只读预览</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

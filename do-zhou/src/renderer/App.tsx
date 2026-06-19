import { useState, useEffect, useCallback, useRef } from 'react'
import { AppLayout } from './components/layout/app-layout'
import { ApiConfigPage } from './pages/api-config-page'
import { SettingsPage } from './pages/settings-page'
import { SkillHomePage } from './pages/skill-home-page'
import { SkillEditorPage } from './pages/skill-editor-page'
import { ChapterIndexPageWrapper } from './components/editor/chapter-index-page-wrapper'

type Page = 'main' | 'api-config' | 'settings' | 'skill-home' | 'skill-editor' | 'chapter-index'

export default function App(): React.ReactElement {
  const [activeProject, setActiveProject] = useState<string | null>(null)
  const [projectPath, setProjectPath] = useState<string | null>(null)
  const [activeSkill, setActiveSkill] = useState<string | null>(null)  // 🆕 当前激活的 Skill
  const [currentPage, setCurrentPage] = useState<Page>('main')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)

  // 编辑器标签页状态
  const [openTabs, setOpenTabs] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<string | null>(null)
  const editorRef = useRef<{ openFile: (fp: string) => void } | null>(null)
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)

  const handleOpenFile = useCallback((filePath: string) => {
    setOpenTabs(prev => prev.includes(filePath) ? prev : [...prev, filePath])
    setActiveTab(filePath)
    if (editorRef.current) editorRef.current.openFile(filePath)
  }, [])

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.project) return
    api.project.list().then(async (projects) => {
      if (projects.length > 0) {
        // 加载最近创建的项目（project-index 按创建顺序排列，最后一个是最新的）
        const latest = projects[projects.length - 1]
        setActiveProject(latest.name)
        setProjectPath(latest.path)
      } else {
        try {
          const p = await api.project.create('写作项目-demo', '通用')
          setActiveProject(p.name)
          setProjectPath(p.path)
        } catch (e) {
          console.error('创建demo项目失败:', e)
        }
      }
    })
  }, [])

  const handleSelectModel = useCallback((providerId: string, modelId: string) => {
    setSelectedModel(`${providerId}:${modelId}`)
  }, [])

  // 键盘快捷键：Ctrl+Shift+C → 章节目录 demo
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        e.preventDefault()
        setCurrentPage(p => p === 'chapter-index' ? 'main' : 'chapter-index')
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  // demo 工具栏按钮
  const handleChapterIndexClick = useCallback(() => {
    setCurrentPage(p => p === 'chapter-index' ? 'main' : 'chapter-index')
  }, [])

  if (currentPage === 'api-config') {
    return <ApiConfigPage onBack={() => setCurrentPage('main')} />
  }

  if (currentPage === 'settings') {
    return <SettingsPage onBack={() => setCurrentPage('main')} onOpenApiConfig={() => setCurrentPage('api-config')} />
  }

  if (currentPage === 'skill-home') {
    return <SkillHomePage
      onOpenProject={(skill, project, projectPath) => { setActiveSkill(skill); setActiveProject(project); setProjectPath(projectPath || project); setCurrentPage('main') }}
      onEditSkill={(skillId) => { setEditingSkillId(skillId); setCurrentPage('skill-editor') }}
      onOpenSettings={() => setCurrentPage('settings')}
    />
  }

  if (currentPage === 'skill-editor') {
    return <SkillEditorPage skillId={editingSkillId || '__new__'} onBack={() => { setEditingSkillId(null); setCurrentPage('skill-home') }} />
  }

  // Phase 9: 章节目录视图（读取真实文件）
  if (currentPage === 'chapter-index') {
    return (
      <ChapterIndexPageWrapper
        projectPath={projectPath}
        onChapterClick={(n) => {
          const fn = `chapters/Chapter-${String(n).padStart(2, '0')}.md`
          const fullPath = projectPath ? `${projectPath}/${fn}` : fn
          handleOpenFile(fullPath)
          setCurrentPage('main') // Spec §5: 点击章节行 → 切回工作台编辑区
        }}
        onBack={() => setCurrentPage('main')}
        onBackToChapterIndex={() => setCurrentPage('chapter-index')}
      />
    )
  }

  return (
    <>
      <AppLayout
        activeProject={activeProject}
        projectPath={projectPath}
        selectedModel={selectedModel}
        onSelectModel={handleSelectModel}
        onOpenConfig={() => setCurrentPage('api-config')}
        onOpenSettings={() => setCurrentPage('settings')}
        onHomeClick={() => setCurrentPage('skill-home')}
        onChapterIndexClick={() => setCurrentPage('chapter-index')}
        activeSkill={activeSkill}
        onOpenFile={handleOpenFile}
        openTabs={openTabs}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onCloseTab={(fp) => { setOpenTabs(prev => prev.filter(t => t !== fp)); if (activeTab === fp) setActiveTab(null) }}
      />
    </>
  )
}

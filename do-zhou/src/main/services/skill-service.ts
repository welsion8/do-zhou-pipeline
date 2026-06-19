/**
 * Skill 管理服务 — 增删改查、导入导出、排序、关联保护
 */

import * as fs from 'fs'
import * as path from 'path'

export interface SkillEntry {
  id: string
  name: string
  version: string
  category: string        // 题材类型（言情/悬疑/科幻等）
  stages: string[]         // 自定义阶段列表
  projectCount: number     // 关联的项目数
  expanded: boolean        // UI 展开状态
  order: number
  createdAt: string
}

export class SkillService {
  private dataRoot: string
  private skillsDir: string
  private projectsDir: string

  constructor(dataRoot: string) {
    this.dataRoot = dataRoot
    this.skillsDir = path.join(dataRoot, 'skills')
    this.projectsDir = path.join(dataRoot, 'projects')
    if (!fs.existsSync(this.skillsDir)) fs.mkdirSync(this.skillsDir, { recursive: true })
    if (!fs.existsSync(this.projectsDir)) fs.mkdirSync(this.projectsDir, { recursive: true })
  }

  /** 获取所有 Skill */
  getAll(): SkillEntry[] {
    if (!fs.existsSync(this.skillsDir)) return []
    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory())
      .map(e => this.readSkillMeta(e.name))
      .filter(Boolean)
      .sort((a, b) => a!.order - b!.order) as SkillEntry[]
  }

  /** 读取单个 Skill 的元信息 */
  private readSkillMeta(skillName: string): SkillEntry | null {
    const skillPath = path.join(this.skillsDir, skillName)
    const claudePath = path.join(skillPath, 'CLAUDE.md')
    if (!fs.existsSync(claudePath)) return null

    const stat = fs.statSync(skillPath)
    const projectsDir = path.join(this.projectsDir, skillName)
    const projectCount = fs.existsSync(projectsDir)
      ? fs.readdirSync(projectsDir, { withFileTypes: true }).filter(e => e.isDirectory()).length
      : 0

    // 从 CLAUDE.md 解析真实元数据
    let category = '通用', version = '1.0'
    const stages: string[] = []
    try {
      const content = fs.readFileSync(claudePath, 'utf-8')
      // 解析题材: [角色]中的 "现代言情"、"悬疑推理" 等
      const catMatch = content.match(/(?:现代|古风|悬疑|科幻|仙侠|都市|玄幻|推理|武侠)(?:言情|爱情|奇幻|小说|短篇)?/)
      if (catMatch) category = catMatch[0]
      // 解析阶段: [文件结构] 中的 outline.md/character.md 等映射
      const fileMap: Record<string, string> = { 'outline.md': '故事大纲', 'character.md': '人物小传', 'chapter_index.md': '章节目录', 'chapters/': '章节写作' }
      const structSection = content.match(/\[文件结构\]([\s\S]*?)(?=\[|$)/)
      if (structSection) {
        for (const [file, label] of Object.entries(fileMap)) {
          if (structSection[1].includes(file)) stages.push(label)
        }
      }
      // 版本
      const verMatch = content.match(/版本[：:]\s*(.+)/)
      if (verMatch) version = verMatch[1].trim()
    } catch (_) { /* fallback to defaults */ }

    // 无自定义阶段时用默认
    if (stages.length === 0) stages.push('故事大纲', '人物小传', '章节目录', '章节写作')

    return {
      id: skillName, name: skillName, version, category, stages,
      projectCount, expanded: false, order: 0,
      createdAt: stat.birthtime.toISOString(),
    }
  }

  /** 创建 Skill */
  create(name: string, category: string, stages: string[]): SkillEntry {
    const skillDir = path.join(this.skillsDir, name)
    if (fs.existsSync(skillDir)) throw new Error(`Skill "${name}" 已存在`)

    fs.mkdirSync(skillDir, { recursive: true })
    fs.writeFileSync(path.join(skillDir, 'CLAUDE.md'), `# ${name}\n\n> 题材: ${category}\n\n## 工作阶段\n\n${stages.map(s => `- ${s}`).join('\n')}\n`, 'utf-8')

    // 创建项目子目录
    const projDir = path.join(this.projectsDir, name)
    if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true })

    return this.readSkillMeta(name)!
  }

  /** 导入 Skill（从文件夹复制） */
  importFromFolder(sourcePath: string, newName?: string): SkillEntry {
    const skillName = newName || path.basename(sourcePath)
    const targetPath = path.join(this.skillsDir, skillName)

    if (fs.existsSync(targetPath)) {
      throw new Error(`Skill "${skillName}" 已存在`)
    }

    // 递归复制
    this.copyDirSync(sourcePath, targetPath)

    // 创建项目目录
    const projDir = path.join(this.projectsDir, skillName)
    if (!fs.existsSync(projDir)) fs.mkdirSync(projDir, { recursive: true })

    return this.readSkillMeta(skillName)!
  }

  /** 导出 Skill（打包为文件夹） */
  exportToFolder(skillName: string, destPath: string): string {
    const sourcePath = path.join(this.skillsDir, skillName)
    if (!fs.existsSync(sourcePath)) throw new Error(`Skill "${skillName}" 不存在`)

    const exportPath = path.join(destPath, skillName)
    this.copyDirSync(sourcePath, exportPath)
    return exportPath
  }

  /** 删除 Skill（含关联保护） */
  delete(skillName: string, force: boolean = false): { deleted: boolean; orphanProjects: number } {
    const skillPath = path.join(this.skillsDir, skillName)
    if (!fs.existsSync(skillPath)) throw new Error(`Skill "${skillName}" 不存在`)

    const projDir = path.join(this.projectsDir, skillName)
    const projectCount = fs.existsSync(projDir)
      ? fs.readdirSync(projDir, { withFileTypes: true }).filter(e => e.isDirectory()).length
      : 0

    if (projectCount > 0 && !force) {
      return { deleted: false, orphanProjects: projectCount }
    }

    // 删除 Skill 目录
    fs.rmSync(skillPath, { recursive: true, force: true })

    return { deleted: true, orphanProjects: projectCount }
  }

  /** 重命名 Skill */
  rename(oldName: string, newName: string): SkillEntry {
    const oldPath = path.join(this.skillsDir, oldName)
    const newPath = path.join(this.skillsDir, newName)
    if (!fs.existsSync(oldPath)) throw new Error(`Skill "${oldName}" 不存在`)
    if (fs.existsSync(newPath)) throw new Error(`Skill "${newName}" 已存在`)

    fs.renameSync(oldPath, newPath)

    // 同步重命名项目目录
    const oldProjDir = path.join(this.projectsDir, oldName)
    const newProjDir = path.join(this.projectsDir, newName)
    if (fs.existsSync(oldProjDir)) fs.renameSync(oldProjDir, newProjDir)

    return this.readSkillMeta(newName)!
  }

  /** 更新扩展状态 */
  setExpanded(skillName: string, expanded: boolean): void {
    // 持久化到内存中，不写文件（UI 状态）
    // 实际通过 IPC 调用时由 renderer 维护状态
  }

  private copyDirSync(src: string, dest: string): void {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
    const entries = fs.readdirSync(src, { withFileTypes: true })
    for (const entry of entries) {
      const s = path.join(src, entry.name)
      const d = path.join(dest, entry.name)
      if (entry.isDirectory()) this.copyDirSync(s, d)
      else fs.copyFileSync(s, d)
    }
  }
}

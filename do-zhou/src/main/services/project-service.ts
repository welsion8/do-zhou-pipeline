import path from 'path'
import fs from 'fs'
import { fileService } from './file-service'
import { trashService } from './trash-service'

const PI = 'project-index.json'

const defaults: Record<string, string> = {
  'outline.md': '# 故事大纲\n\n',
  'character.md': '# 人物小传\n\n',
  'chapter-index.md': '# 章节目录\n\n**第一章** 未命名\n\n',
  'chapters/.gitkeep': ''
}

async function readIdx() { if (!(await fileService.exists(PI))) return []; return JSON.parse(await fileService.readFile(PI)) as { name: string; skillName: string; path: string; createdAt: string }[] }
async function writeIdx(d: unknown[]) { await fileService.writeFile(PI, JSON.stringify(d, null, 2)) }

export const projectService = {
  create: async (name: string, skillName: string, dataRoot?: string) => {
    const pd = path.join('projects', skillName, name)
    if (await fileService.exists(pd)) throw new Error(`项目 "${name}" 已存在`)
    await fileService.mkdir(pd)
    await fileService.mkdir(path.join(pd, 'chapters'))
    await fileService.mkdir(path.join(pd, '.session'))

    // 尝试从 Skill 模板初始化项目文件
    let usedTemplates = false
    if (dataRoot && skillName) {
      const skillDir = path.join(dataRoot, 'skills', skillName)
      const templateDir = path.join(skillDir, `${skillName}-skills`, 'templates')
      if (fs.existsSync(templateDir)) {
        try {
          for (const f of fs.readdirSync(templateDir)) {
            if (f.endsWith('.md')) {
              // 模板文件映射规则：移除 -template 后缀即为目标文件名
              let targetName = f.replace('-template', '')
              // chapter-template.md → chapters/Chapter-01.md
              if (f.includes('chapter-template')) {
                const chDir = path.join(pd, 'chapters')
                if (!fs.existsSync(chDir)) fs.mkdirSync(chDir, { recursive: true })
                const content = fs.readFileSync(path.join(templateDir, f), 'utf-8')
                await fileService.writeFile(path.join(chDir, 'Chapter-01.md'), content)
                usedTemplates = true
                continue
              }
              const content = fs.readFileSync(path.join(templateDir, f), 'utf-8')
              await fileService.writeFile(path.join(pd, targetName), content)
              usedTemplates = true
            }
          }
        } catch (_) { /* fallback to defaults */ }
      }
    }

    // 无 Skill 模板时使用硬编码默认文件
    if (!usedTemplates) {
      for (const [f, c] of Object.entries(defaults)) await fileService.writeFile(path.join(pd, f), c)
    }

    const meta = { name, skillName, path: pd, createdAt: new Date().toISOString() }
    const idx = await readIdx(); idx.push(meta); await writeIdx(idx)
    return meta
  },
  list: async (skillName?: string) => { const idx = await readIdx(); return skillName ? idx.filter((p: { skillName: string }) => p.skillName === skillName) : idx },
  get: async (name: string) => { const idx = await readIdx(); return idx.find((p: { name: string }) => p.name === name) ?? null },
  delete: async (name: string) => {
    const idx = await readIdx(); const p = idx.find((p: { name: string }) => p.name === name)
    if (!p) throw new Error(`项目 "${name}" 不存在`)
    await trashService.moveToTrash(p.path, name)
    await writeIdx(idx.filter((p: { name: string }) => p.name !== name))
  },
  rename: async (oldN: string, newN: string) => {
    const idx = await readIdx(); const p = idx.find((p: { name: string }) => p.name === oldN)
    if (!p) throw new Error(`项目 "${oldN}" 不存在`)
    const np = path.join(path.dirname(p.path), newN)
    await fileService.rename(p.path, np); p.name = newN; p.path = np; await writeIdx(idx)
  },
  listFiles: async (name: string) => {
    const idx = await readIdx(); const p = idx.find((x: { name: string }) => x.name === name)
    if (!p) return []
    return (await fileService.listDir(p.path)).filter((e: { name: string }) => e.name !== '.session')
  }
}

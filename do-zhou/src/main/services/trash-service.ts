import path from 'path'
import { fileService } from './file-service'

const TD = '.trash'

export const trashService = {
  moveToTrash: async (relPath: string, name: string) => {
    await fileService.mkdir(TD)
    const tn = `${Date.now()}-${name}`
    await fileService.rename(relPath, path.join(TD, tn))
    const idx = await trashService.listTrash()
    idx.push({ name, originalName: name, originalPath: relPath, path: relPath, deletedAt: new Date().toISOString() })
    await fileService.writeFile(path.join(TD, 'index.json'), JSON.stringify(idx, null, 2))
  },
  listTrash: async () => {
    const p = path.join(TD, 'index.json')
    if (!(await fileService.exists(p))) return []
    return JSON.parse(await fileService.readFile(p)) as { originalName: string; originalPath: string; deletedAt: string }[]
  },
  restore: async (name: string, strategy: 'overwrite' | 'rename') => {
    const idx = await trashService.listTrash()
    const item = idx.find(i => i.originalName === name)
    if (!item) throw new Error(`Not found: ${name}`)
    const entries = await fileService.listDir(TD)
    const e = entries.find(e => e.name.includes(`-${name}`))
    if (!e) throw new Error(`Trash file not found: ${name}`)
    const sp = path.join(TD, e.name)
    let dp = item.originalPath
    if (strategy === 'rename') { let c = 1; while (await fileService.exists(dp)) { dp = `${item.originalPath} (恢复${c})`; c++ } }
    await fileService.rename(sp, dp)
    await fileService.writeFile(path.join(TD, 'index.json'), JSON.stringify(idx.filter(i => i.originalName !== name), null, 2))
    return dp
  },
  empty: async () => {
    const items = await trashService.listTrash()
    for (const item of items) {
      const entries = await fileService.listDir(TD)
      const e = entries.find(e => e.name.includes(`-${item.originalName}`))
      if (e) await fileService.delete(path.join(TD, e.name))
    }
    await fileService.writeFile(path.join(TD, 'index.json'), '[]')
  }
}

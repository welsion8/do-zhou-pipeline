import fs from 'fs/promises'
import path from 'path'
import { app } from 'electron'

function getDataRoot(): string { return path.join(app.getPath('userData'), 'do-zhou-data') }

function resolveSafePath(...segments: string[]): string {
  const r = path.resolve(getDataRoot(), ...segments)
  if (!path.normalize(r).startsWith(path.normalize(getDataRoot()))) throw new Error(`Path outside data root: ${segments.join('/')}`)
  return r
}

export const fileService = {
  readFile: async (p: string) => fs.readFile(resolveSafePath(p), 'utf-8'),
  writeFile: async (p: string, c: string) => { const fp = resolveSafePath(p); await fs.mkdir(path.dirname(fp), { recursive: true }); return fs.writeFile(fp, c, 'utf-8') },
  listDir: async (p: string) => (await fs.readdir(resolveSafePath(p), { withFileTypes: true })).map(e => ({ name: e.name, isDirectory: e.isDirectory() })),
  delete: async (p: string) => fs.rm(resolveSafePath(p), { recursive: true, force: true }),
  rename: async (o: string, n: string) => { await fs.mkdir(path.dirname(resolveSafePath(n)), { recursive: true }); return fs.rename(resolveSafePath(o), resolveSafePath(n)) },
  mkdir: async (p: string) => fs.mkdir(resolveSafePath(p), { recursive: true }),
  exists: async (p: string) => { try { await fs.access(resolveSafePath(p)); return true } catch { return false } },
  getDataRoot
}

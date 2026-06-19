import { contextBridge, ipcRenderer } from 'electron'

const api = {
  window: {
    minimize: () => ipcRenderer.send('window:minimize'),
    maximize: () => ipcRenderer.send('window:maximize'),
    close: () => ipcRenderer.send('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized')
  },
  file: {
    read: (p: string) => ipcRenderer.invoke('file:read', p),
    write: (p: string, c: string) => ipcRenderer.invoke('file:write', p, c),
    list: (p: string) => ipcRenderer.invoke('file:list', p),
    delete: (p: string) => ipcRenderer.invoke('file:delete', p),
    rename: (o: string, n: string) => ipcRenderer.invoke('file:rename', o, n),
    mkdir: (p: string) => ipcRenderer.invoke('file:mkdir', p),
    exists: (p: string) => ipcRenderer.invoke('file:exists', p)
  },
  project: {
    create: (n: string, s: string) => ipcRenderer.invoke('project:create', n, s),
    list: (s?: string) => ipcRenderer.invoke('project:list', s),
    get: (n: string) => ipcRenderer.invoke('project:get', n),
    delete: (n: string) => ipcRenderer.invoke('project:delete', n),
    rename: (o: string, n: string) => ipcRenderer.invoke('project:rename', o, n),
    listFiles: (n: string) => ipcRenderer.invoke('project:listFiles', n)
  },
  trash: {
    list: () => ipcRenderer.invoke('trash:list'),
    restore: (n: string, s: string) => ipcRenderer.invoke('trash:restore', n, s),
    empty: () => ipcRenderer.invoke('trash:empty')
  },
  apiConfig: {
    getAll: () => ipcRenderer.invoke('api-config:getAll'),
    getKey: (id: string) => ipcRenderer.invoke('api-config:getKey', id),
    update: (id: string, u: Record<string, unknown>) => ipcRenderer.invoke('api-config:update', id, u),
    addCustom: (n: string, u: string, k: string) => ipcRenderer.invoke('api-config:addCustom', n, u, k),
    delete: (id: string) => ipcRenderer.invoke('api-config:delete', id),
    reorder: (ids: string[]) => ipcRenderer.invoke('api-config:reorder', ids),
    fetchModels: (id: string) => ipcRenderer.invoke('api-config:fetchModels', id),
    testConnection: (id: string) => ipcRenderer.invoke('api-config:testConnection', id),
  },
  skill: {
    getAll: () => ipcRenderer.invoke('skill:getAll'),
    create: (name: string, category: string, stages: string[]) => ipcRenderer.invoke('skill:create', name, category, stages),
    import: () => ipcRenderer.invoke('skill:import'),
    export: (skillName: string) => ipcRenderer.invoke('skill:export', skillName),
    delete: (skillName: string, force: boolean) => ipcRenderer.invoke('skill:delete', skillName, force),
    rename: (oldName: string, newName: string) => ipcRenderer.invoke('skill:rename', oldName, newName),
    importOverwrite: (sourcePath: string, existingName: string) => ipcRenderer.invoke('skill:importOverwrite', sourcePath, existingName),
    importRename: (sourcePath: string, newName: string) => ipcRenderer.invoke('skill:importRename', sourcePath, newName),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (s: Record<string, unknown>) => ipcRenderer.invoke('settings:save', s),
    reset: () => ipcRenderer.invoke('settings:reset'),
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list'),
    create: (projectPath: string, name: string) => ipcRenderer.invoke('backup:create', projectPath, name),
    restore: (backupName: string, targetPath: string) => ipcRenderer.invoke('backup:restore', backupName, targetPath),
    prune: (maxCount: number) => ipcRenderer.invoke('backup:prune', maxCount),
  },
  engine: {
    chat: (arg: { sessionId?: string; messages: any[]; projectRoot: string; config: any; systemPrompt?: string; maxTokens?: number; mode?: string; userMessage?: string }) => ipcRenderer.invoke('engine:chat', arg),
    chatStream: (arg: { sessionId?: string; messages: any[]; projectRoot: string; config: any; systemPrompt?: string }) => ipcRenderer.invoke('engine:chatStream', arg),
    loadSession: (sid: string) => ipcRenderer.invoke('engine:loadSession', sid),
    listSessions: () => ipcRenderer.invoke('engine:listSessions'),
    deleteSession: (sid: string) => ipcRenderer.invoke('engine:deleteSession', sid),
  },
  tool: {
    readFile: (path: string) => ipcRenderer.invoke('tool:readFile', path),
    writeFile: (path: string, content: string) => ipcRenderer.invoke('tool:writeFile', path, content),
    glob: (pattern: string) => ipcRenderer.invoke('tool:glob', pattern),
    grep: (path: string, regex: string) => ipcRenderer.invoke('tool:grep', path, regex),
  },
  notify: {
    complete: (title: string, body: string) => ipcRenderer.invoke('notify:complete', title, body),
    error: (title: string, body: string) => ipcRenderer.invoke('notify:error', title, body),
  },
  app: { getDataRoot: () => ipcRenderer.invoke('app:getDataRoot') },
  platform: process.platform
}

contextBridge.exposeInMainWorld('electronAPI', api)

export type ElectronAPI = typeof api

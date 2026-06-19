interface Window {
  electronAPI?: {
    window: { minimize: () => void; maximize: () => void; close: () => void; isMaximized: () => Promise<boolean> }
    file: {
      read: (p: string) => Promise<string>; write: (p: string, c: string) => Promise<void>
      list: (p: string) => Promise<{ name: string; isDirectory: boolean }[]>
      delete: (p: string) => Promise<void>; rename: (o: string, n: string) => Promise<void>
      mkdir: (p: string) => Promise<void>; exists: (p: string) => Promise<boolean>
    }
    project: {
      create: (n: string, s: string) => Promise<{ name: string; skillName: string; path: string }>
      list: (s?: string) => Promise<{ name: string; skillName: string; path: string }[]>
      get: (n: string) => Promise<{ name: string; skillName: string; path: string } | null>
      delete: (n: string) => Promise<void>; rename: (o: string, n: string) => Promise<void>
      listFiles: (n: string) => Promise<{ name: string; isDirectory: boolean }[]>
    }
    trash: { list: () => Promise<unknown[]>; restore: (n: string, s: string) => Promise<string>; empty: () => Promise<void> }
    apiConfig: {
      getAll: () => Promise<{ id: string; name: string; apiUrl: string; apiKey: string; models: string[]; enabled: boolean; order: number; isBuiltin: boolean }[]>
      getKey: (id: string) => Promise<string>
      update: (id: string, u: Record<string, unknown>) => Promise<unknown>
      addCustom: (n: string, u: string, k: string) => Promise<unknown>
      delete: (id: string) => Promise<boolean>
      reorder: (ids: string[]) => Promise<void>
      fetchModels: (id: string) => Promise<string[]>
      testConnection: (id: string) => Promise<boolean>
    }
    engine: {
      chat: (arg: Record<string, unknown>) => Promise<{ success: boolean; messages?: Array<{ role: string; content: string; timestamp: number }>; error?: string }>
      loadSession: (sid: string) => Promise<Array<{ role: string; content: string; timestamp: number }>>
      listSessions: () => Promise<unknown[]>
      deleteSession: (sid: string) => Promise<void>
    }
    app: { getDataRoot: () => Promise<string> }
    platform: NodeJS.Platform
  }
}

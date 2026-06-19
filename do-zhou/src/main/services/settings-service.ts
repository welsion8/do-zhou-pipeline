/**
 * 设置服务 — 读取/写入 settings.json
 */

import * as fs from 'fs'
import * as path from 'path'

export interface AppSettings {
  editor: {
    fontFamily: string; fontSize: number; lineHeight: number
    autoSaveInterval: number; tabWidth: number; editorWidth: number
  }
  appearance: {
    theme: 'dark' | 'light' | 'system'; accentColor: string; language: string
  }
  ai: {
    defaultProvider: string; defaultModel: string; streamOutput: boolean; maxTokens: number
  }
  data: {
    dataRoot: string; autoBackup: boolean; backupCount: number; backupDir: string
  }
}

const DEFAULT_SETTINGS: AppSettings = {
  editor: { fontFamily: 'ui-sans-serif', fontSize: 14, lineHeight: 1.7, autoSaveInterval: 2, tabWidth: 80, editorWidth: 0 },
  appearance: { theme: 'dark', accentColor: '#6B7A8A', language: 'zh-CN' },
  ai: { defaultProvider: '', defaultModel: '', streamOutput: true, maxTokens: 4096 },
  data: { dataRoot: '', autoBackup: true, backupCount: 5, backupDir: '' },
}

export class SettingsService {
  private settingsPath: string

  constructor(dataRoot: string) {
    this.settingsPath = path.join(dataRoot, 'settings.json')
    if (!fs.existsSync(dataRoot)) fs.mkdirSync(dataRoot, { recursive: true })
  }

  get(): AppSettings {
    if (!fs.existsSync(this.settingsPath)) return { ...DEFAULT_SETTINGS }
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(this.settingsPath, 'utf-8')) }
    } catch { return { ...DEFAULT_SETTINGS } }
  }

  save(settings: Partial<AppSettings>): AppSettings {
    const current = this.get()
    const merged = { ...current, ...settings }
    fs.writeFileSync(this.settingsPath, JSON.stringify(merged, null, 2), 'utf-8')
    return merged
  }

  reset(): AppSettings {
    fs.writeFileSync(this.settingsPath, JSON.stringify(DEFAULT_SETTINGS, null, 2), 'utf-8')
    return { ...DEFAULT_SETTINGS }
  }
}

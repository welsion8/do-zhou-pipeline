import { ipcMain } from 'electron'
import type { ApiConfigService, ProviderConfig } from '../services/api-config-service'

export function registerApiConfigIpc(service: ApiConfigService) {
  ipcMain.handle('api-config:getAll', (): ProviderConfig[] => service.getAll())

  ipcMain.handle('api-config:getKey', (_e, id: string): string => service.getKey(id))

  ipcMain.handle('api-config:update', (_e, id: string, updates: Record<string, unknown>) =>
    service.update(id, updates as { apiUrl?: string; apiKey?: string; enabled?: boolean; name?: string }))

  ipcMain.handle('api-config:addCustom', (_e, name: string, apiUrl: string, apiKey: string): ProviderConfig =>
    service.addCustom(name, apiUrl, apiKey))

  ipcMain.handle('api-config:delete', (_e, id: string): boolean => service.delete(id))

  ipcMain.handle('api-config:reorder', (_e, ids: string[]) => service.reorder(ids))

  ipcMain.handle('api-config:fetchModels', async (_e, id: string): Promise<string[]> => service.fetchModels(id))

  ipcMain.handle('api-config:testConnection', async (_e, id: string): Promise<boolean> => service.testConnection(id))
}

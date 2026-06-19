import { useState, useCallback } from 'react'

interface FileEntry {
  name: string
  isDirectory: boolean
}

interface UseFileSystemReturn {
  listFiles: (dirPath: string) => Promise<FileEntry[]>
  readFile: (filePath: string) => Promise<string>
  writeFile: (filePath: string, content: string) => Promise<void>
  deleteFile: (filePath: string) => Promise<void>
  renameFile: (oldPath: string, newPath: string) => Promise<void>
  mkdir: (dirPath: string) => Promise<void>
  fileExists: (filePath: string) => Promise<boolean>
  loading: boolean
  error: string | null
  clearError: () => void
}

export function useFileSystem(): UseFileSystemReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const withApi = useCallback(async <T>(fn: (api: NonNullable<typeof window.electronAPI>) => Promise<T>): Promise<T> => {
    const api = window.electronAPI
    if (!api) throw new Error('electronAPI 不可用：请在 Electron 环境中运行')
    setLoading(true)
    setError(null)
    try {
      return await fn(api)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg)
      throw e
    } finally {
      setLoading(false)
    }
  }, [])

  const listFiles = useCallback((dirPath: string) =>
    withApi(api => api.file.list(dirPath)), [withApi])

  const readFile = useCallback((filePath: string) =>
    withApi(api => api.file.read(filePath)), [withApi])

  const writeFile = useCallback((filePath: string, content: string) =>
    withApi(api => api.file.write(filePath, content)), [withApi])

  const deleteFile = useCallback((filePath: string) =>
    withApi(api => api.file.delete(filePath)), [withApi])

  const renameFile = useCallback((oldPath: string, newPath: string) =>
    withApi(api => api.file.rename(oldPath, newPath)), [withApi])

  const mkdir = useCallback((dirPath: string) =>
    withApi(api => api.file.mkdir(dirPath)), [withApi])

  const fileExists = useCallback((filePath: string) =>
    withApi(api => api.file.exists(filePath)), [withApi])

  return { listFiles, readFile, writeFile, deleteFile, renameFile, mkdir, fileExists, loading, error, clearError }
}

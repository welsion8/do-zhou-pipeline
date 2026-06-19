import { ipcMain } from 'electron'
import { agentLoop } from '../engine/universal/agent-loop'
import { SessionStore } from '../engine/universal/session-store'
import type { Message, EngineConfig } from '../engine/types'

export function registerEngineIpc(dataRoot: string) {
  const sessionStore = new SessionStore(dataRoot)
  let isGenerating = false

  // 非流式对话
  ipcMain.handle('engine:chat', async (_e, arg: {
    sessionId: string; messages: Message[]; projectRoot: string
    config: EngineConfig; systemPrompt?: string
  }) => {
    if (isGenerating) return { error: 'AI 正在生成中，请等待当前任务完成' }
    isGenerating = true
    try {
      const updated = await agentLoop({
        config: arg.config,
        messages: arg.messages,
        projectRoot: arg.projectRoot,
        systemPrompt: arg.systemPrompt,
      })
      // 持久化新消息
      const existingIds = new Set(arg.messages.map(m => `${m.role}:${m.timestamp}`))
      const newMsgs = updated.filter(m => !existingIds.has(`${m.role}:${m.timestamp}`))
      for (const m of newMsgs) sessionStore.append(arg.sessionId, m)
      return { success: true, messages: updated }
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : String(e) }
    } finally {
      isGenerating = false
    }
  })

  // 流式对话 —— 通过 event 推送 chunk
  ipcMain.on('engine:chatStream', (event, arg: {
    sessionId: string; messages: Message[]; projectRoot: string
    config: EngineConfig; systemPrompt?: string
  }) => {
    const sender = event.sender
    agentLoop({
      config: arg.config,
      messages: arg.messages,
      projectRoot: arg.projectRoot,
      systemPrompt: arg.systemPrompt,
      onChunk: (delta) => sender.send('engine:streamChunk', { delta }),
      onToken: (usage) => sender.send('engine:tokenUsage', usage),
    }).then(updated => {
      const existingIds = new Set(arg.messages.map(m => `${m.role}:${m.timestamp}`))
      const newMsgs = updated.filter(m => !existingIds.has(`${m.role}:${m.timestamp}`))
      for (const m of newMsgs) sessionStore.append(arg.sessionId, m)
      sender.send('engine:streamDone', { success: true, messages: updated })
    }).catch(e => {
      sender.send('engine:streamDone', { success: false, error: e instanceof Error ? e.message : String(e) })
    })
  })

  // Session 管理
  ipcMain.handle('engine:loadSession', (_e, sessionId: string) => sessionStore.load(sessionId))
  ipcMain.handle('engine:listSessions', () => sessionStore.list())
  ipcMain.handle('engine:deleteSession', (_e, sessionId: string) => { sessionStore.delete(sessionId) })
}

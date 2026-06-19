import { useRef, useEffect, useCallback, useState } from 'react'
import { ChatHeader } from './chat-header'
import { ChatMessageAI } from './chat-message-ai'
import { ChatMessageUser } from './chat-message-user'
import { ChatSystemMessage } from './chat-system-message'
import { ChatInputBar } from './chat-input-bar'
import { useChatEngine } from '../../hooks/use-chat-engine'

interface Props {
  projectRoot?: string
  activeSkill?: string | null
}

export function ChatView({ projectRoot, activeSkill }: Props): React.ReactElement {
  const { messages, isStreaming, error, setError, sendMessage, tokenUsage } = useChatEngine()
  const [skillPrompt, setSkillPrompt] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUp = useRef(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchIdx, setSearchIdx] = useState(0)

  // 加载当前 Skill 的 CLAUDE.md 作为 AI 系统提示词
  useEffect(() => {
    if (!activeSkill) { setSkillPrompt(''); return }
    (async () => {
      const base = await window.electronAPI?.app?.getDataRoot?.().catch(() => '') || ''
      const content = await window.electronAPI?.tool?.readFile(`${base}/skills/${activeSkill}/CLAUDE.md`) || ''
      setSkillPrompt(content)
    })()
  }, [activeSkill])

  // 自动滚底
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { if (!userScrolledUp.current) scrollToBottom() }, [messages, scrollToBottom])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    userScrolledUp.current = el.scrollHeight - el.scrollTop - el.clientHeight > 50
  }, [])

  const handleSend = useCallback((content: string) => {
    userScrolledUp.current = false
    const systemPrompt = skillPrompt || '你是 Do 舟的 AI 写作助手。使用工具读写项目文件来帮助用户创作。用中文回复。'
    sendMessage(content, projectRoot, systemPrompt)
  }, [sendMessage, projectRoot, skillPrompt])

  return (
    <div className="flex flex-col h-full bg-bg-panel">
      <ChatHeader
        tokenCount={tokenUsage}
        onSearch={() => setSearchTerm(s => s ? '' : ' ')}
        onExport={() => {
          const md = messages.map(m => `**${m.role}**: ${m.content}`).join('\n\n')
          const blob = new Blob([md], { type: 'text/markdown' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a'); a.href = url; a.download = 'conversation-export.md'; a.click()
        }}
      />

      {/* 搜索栏 */}
      {searchTerm !== '' && (
        <div className="flex items-center gap-[8px] px-[16px] py-[6px] bg-bg-active border-b border-border-default shrink-0">
          <input
            className="flex-1 bg-bg-base border border-border-default rounded-sm px-[8px] py-[4px] text-text-primary text-[12px] font-ui outline-none focus:border-accent-dim"
            placeholder="搜索对话内容..."
            value={searchTerm === ' ' ? '' : searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setSearchIdx(0) }}
            autoFocus
            data-testid="find-input"
          />
          {searchTerm && searchTerm !== ' ' && (
            <span className="text-text-tertiary text-[11px] font-ui shrink-0">
              {(() => {
                const matches = messages.filter(m => m.content.includes(searchTerm))
                return matches.length > 0 ? `${Math.min(searchIdx + 1, matches.length)}/${matches.length}` : '0/0'
              })()}
            </span>
          )}
          <button className="text-text-tertiary text-[14px] hover:text-text-primary" onClick={() => setSearchIdx(i => Math.max(0, i - 1))}>↑</button>
          <button className="text-text-tertiary text-[14px] hover:text-text-primary" onClick={() => { const c = messages.filter(m => m.content.includes(searchTerm)).length; setSearchIdx(i => Math.min(c - 1, i + 1)) }}>↓</button>
          <button className="text-text-tertiary text-[14px] hover:text-text-primary ml-[4px]" onClick={() => setSearchTerm('')}>×</button>
        </div>
      )}

      {/* 消息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-[16px]" onScroll={handleScroll} data-testid="chat-body">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-text-tertiary text-[12px] select-none">
            <p>在下方输入消息开始 AI 对话</p>
          </div>
        )}
        {messages.map((msg, i) => {
          if (msg.role === 'system' || msg.role === 'tool') {
            return <ChatSystemMessage key={i} content={msg.content} timestamp={msg.timestamp} />
          }
          if (msg.role === 'user') {
            return <div key={i} data-testid="user-message"><ChatMessageUser content={msg.content} /></div>
          }
          return (
            <div key={i} data-testid="ai-message">
              <ChatMessageAI content={msg.content} isStreaming={isStreaming && i === messages.length - 1} />
              {/* 章节完成引导: AI 消息含 "第N章" → 显示继续引导 */}
              {!isStreaming && /第\d+章/.test(msg.content) && (
                <div className="ml-[10px] mt-[6px] text-accent text-[11px] font-ui cursor-pointer hover:underline"
                  onClick={() => sendMessage('继续写下一章', projectRoot)}
                  data-testid="btn-next-chapter">
                  ✅ 章节已完成  [继续写下一章 →]
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* 错误 Toast */}
      {error && (
        <div className="flex items-center justify-between px-[16px] py-[10px] mx-[8px] mb-[4px] rounded-md bg-[#3D2020] border border-[#E57373] shrink-0" data-testid="toast-message">
          <span className="text-[#EF9A9A] text-[12px] font-ui">{error}</span>
          <button className="text-[#EF9A9A] text-[14px] hover:opacity-80" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* 输入栏 */}
      <ChatInputBar onSend={handleSend} disabled={isStreaming} placeholder="输入消息，Enter 发送..." />
    </div>
  )
}

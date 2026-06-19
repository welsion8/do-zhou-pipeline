import ReactMarkdown from 'react-markdown'

interface Props { content: string; isStreaming?: boolean }

export function ChatMessageAI({ content, isStreaming }: Props): React.ReactElement {
  return (
    <div className="flex gap-0 py-[10px]">
      <div className="w-[2px] shrink-0 bg-accent-dim rounded-full self-stretch" />
      <div className="flex-1 pl-[8px] text-text-secondary text-[12px] leading-[1.7] font-ui overflow-x-auto">
        <ReactMarkdown components={{
          p: ({ children }) => <p className="mb-[6px] last:mb-0">{children}</p>,
          code: ({ children }) => <code className="bg-bg-active px-[4px] py-[1px] rounded-sm text-[11px] font-mono">{children}</code>,
          pre: ({ children }) => <pre className="bg-bg-active p-[8px] rounded-sm text-[11px] font-mono overflow-x-auto my-[8px]">{children}</pre>,
          strong: ({ children }) => <strong className="text-text-primary">{children}</strong>,
          ul: ({ children }) => <ul className="list-disc pl-[16px] mb-[6px]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-[16px] mb-[6px]">{children}</ol>,
        }}>
          {content || (isStreaming ? '...' : '')}
        </ReactMarkdown>
      </div>
    </div>
  )
}

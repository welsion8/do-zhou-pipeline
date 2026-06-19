import ReactMarkdown from 'react-markdown'

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps): React.ReactElement {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-[32px] py-[24px] font-editor text-text-secondary leading-[1.8] text-[15px]">
      {content ? (
        <div className="max-w-[720px] mx-auto select-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-text-primary text-[22px] font-semibold font-editor mb-[16px] mt-[32px]">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-text-primary text-[18px] font-semibold font-editor mb-[12px] mt-[24px]">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-text-primary text-[16px] font-semibold font-editor mb-[8px] mt-[16px]">{children}</h3>
              ),
              p: ({ children }) => <p className="mb-[12px]">{children}</p>,
              strong: ({ children }) => <strong className="text-text-primary font-semibold">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              code: ({ children }) => (
                <code className="bg-bg-active px-[6px] py-[2px] rounded-sm text-[13px] font-mono">{children}</code>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-2 border-accent-dim pl-[16px] my-[12px] text-text-secondary italic">{children}</blockquote>
              ),
              ul: ({ children }) => <ul className="list-disc pl-[24px] mb-[12px]">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-[24px] mb-[12px]">{children}</ol>,
              hr: () => <hr className="border-border-default my-[24px]" />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-[80px] gap-[16px]">
          <span className="text-[48px]">📄</span>
          <p className="text-text-primary text-[18px] font-ui font-semibold">暂无内容</p>
          <p className="text-text-tertiary text-[13px]">打开文件开始编辑，或点击 [+ 新建] 创建新文件</p>
        </div>
      )}
    </div>
  )
}

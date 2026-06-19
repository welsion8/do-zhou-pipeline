interface Props { content: string; timestamp?: number }

export function ChatSystemMessage({ content, timestamp }: Props): React.ReactElement {
  const time = timestamp ? new Date(timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : ''
  return (
    <div className="flex items-center gap-[8px] py-[8px]">
      <div className="flex-1 h-[1px] bg-border-default" />
      <span className="text-text-tertiary text-[10px] font-ui shrink-0">{content} {time && `· ${time}`}</span>
      <div className="flex-1 h-[1px] bg-border-default" />
    </div>
  )
}

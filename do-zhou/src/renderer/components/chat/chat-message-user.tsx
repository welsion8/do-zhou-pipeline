interface Props { content: string }

export function ChatMessageUser({ content }: Props): React.ReactElement {
  return (
    <div className="flex justify-end py-[6px]">
      <div className="max-w-[85%] bg-bg-active text-text-primary text-[12px] leading-[1.6] font-ui px-[8px] py-[6px] rounded-sm">
        {content}
      </div>
    </div>
  )
}

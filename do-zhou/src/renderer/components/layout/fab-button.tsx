import { MessageCircle } from 'lucide-react'

export function FabButton({ onClick, visible }: { onClick: () => void; visible: boolean }): React.ReactElement | null {
  if (!visible) return null
  return (
    <button onClick={onClick}
      className="fixed z-40 flex items-center justify-center w-[44px] h-[44px] rounded-[22px] bg-accent-dim border border-border-hover hover:bg-[#4D5862] transition-all duration-150 shadow-lg"
      style={{ right: 16, bottom: 16 }} aria-label="AI 对话">
      <MessageCircle size={20} className="text-text-primary" />
    </button>
  )
}

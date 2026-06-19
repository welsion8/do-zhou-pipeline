interface Props {
  checked: boolean; onChange: (checked: boolean) => void; label?: string
}

export function ToggleSwitch({ checked, onChange, label }: Props): React.ReactElement {
  return (
    <div className="flex items-center justify-between">
      {label && <span className="text-text-secondary text-[13px]">{label}</span>}
      <button
        className={`relative w-[36px] h-[20px] rounded-full transition-colors ${checked ? 'bg-accent-dim' : 'bg-bg-active border border-border-default'}`}
        onClick={() => onChange(!checked)}
      >
        <div className={`absolute top-[2px] w-[16px] h-[16px] rounded-full bg-white transition-all ${checked ? 'left-[18px]' : 'left-[2px]'}`} />
      </button>
    </div>
  )
}

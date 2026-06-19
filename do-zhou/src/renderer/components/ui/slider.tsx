interface Props {
  value: number; min: number; max: number; step?: number
  onChange: (value: number) => void; label?: string
}

export function Slider({ value, min, max, step = 1, onChange, label }: Props): React.ReactElement {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className="flex flex-col gap-[4px]">
      {label && <div className="flex justify-between"><span className="text-text-tertiary text-[12px]">{label}</span><span className="text-text-secondary text-[12px]">{value}</span></div>}
      <input type="range" min={min} max={max} step={step} value={value}
        className="w-full h-[4px] rounded-full bg-bg-active appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent-dim"
        onChange={e => onChange(Number(e.target.value))} />
    </div>
  )
}

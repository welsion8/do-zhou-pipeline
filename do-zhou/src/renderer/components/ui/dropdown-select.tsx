import { useState, useRef, useEffect } from 'react'

interface Props {
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  placeholder?: string
}

export function DropdownSelect({ value, options, onChange, placeholder }: Props): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const selected = options.find(o => o.value === value)
  return (
    <div ref={ref} className="relative">
      <button className="w-full flex items-center justify-between px-[12px] py-[6px] rounded-sm bg-bg-active border border-border-default text-text-primary text-[13px] hover:bg-bg-hover" onClick={() => setOpen(!open)}>
        <span className={selected ? 'text-text-primary' : 'text-text-tertiary'}>{selected?.label || placeholder || '请选择'}</span>
        <span className="text-text-tertiary text-[10px]">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="absolute z-50 w-full mt-[2px] bg-bg-panel border border-border-default rounded-sm shadow-lg py-[2px] max-h-[200px] overflow-y-auto">
          {options.map(o => (
            <div key={o.value} className={`px-[12px] py-[6px] text-[13px] cursor-pointer hover:bg-bg-active ${o.value === value ? 'text-accent bg-bg-active' : 'text-text-secondary'}`}
              onClick={() => { onChange(o.value); setOpen(false) }}>{o.label}</div>
          ))}
        </div>
      )}
    </div>
  )
}

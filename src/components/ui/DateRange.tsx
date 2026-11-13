import { Calendar } from 'lucide-react'
import { Input } from './Field'

interface Props {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

function DateField({ value, onChange, label, min, max }: { value: string; onChange: (v: string) => void; label: string; min?: string; max?: string }) {
  return (
    <div className="relative w-[150px]">
      <Calendar size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
      <Input type="date" value={value} min={min} max={max} onChange={(e) => onChange(e.target.value)} className="date-field relative justify-start pl-9 pr-2 text-left text-[13px]" aria-label={label} />
    </div>
  )
}

export function DateRange({ from, to, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <DateField value={from} max={to || undefined} onChange={(v) => onChange(v, to)} label="Data inicial" />
      <span className="text-xs text-muted">até</span>
      <DateField value={to} min={from || undefined} onChange={(v) => onChange(from, v)} label="Data final" />
    </div>
  )
}

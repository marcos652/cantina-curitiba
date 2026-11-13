import { Input } from './Field'

interface Props {
  from: string
  to: string
  onChange: (from: string, to: string) => void
}

export function DateRange({ from, to, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Input type="date" value={from} max={to || undefined} onChange={(e) => onChange(e.target.value, to)} className="w-[142px]" aria-label="Data inicial" />
      <span className="text-xs text-faint">até</span>
      <Input type="date" value={to} min={from || undefined} onChange={(e) => onChange(from, e.target.value)} className="w-[142px]" aria-label="Data final" />
    </div>
  )
}

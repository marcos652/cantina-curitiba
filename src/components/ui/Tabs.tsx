import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/cx'

export interface TabItem {
  to: string
  label: string
  end?: boolean
}

export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cx(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors',
              isActive ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-ink',
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  )
}

interface ChipProps<T extends string> {
  options: { value: T; label: string; count?: number }[]
  value: T
  onChange: (v: T) => void
  className?: string
}

/** Controle segmentado (Hoje | Ontem | 7 dias | 30 dias). */
export function Chips<T extends string>({ options, value, onChange, className }: ChipProps<T>) {
  return (
    <div className={cx('seg', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cx('seg-item', o.value === value && 'active')}>
          {o.label}
          {typeof o.count === 'number' && <span className={cx('ml-1.5 tabular', o.value === value ? 'text-muted' : 'text-faint')}>{o.count}</span>}
        </button>
      ))}
    </div>
  )
}

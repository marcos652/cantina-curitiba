import { NavLink } from 'react-router-dom'
import { cx } from '@/lib/cx'

export interface TabItem {
  to: string
  label: string
  end?: boolean
}

export function Tabs({ items }: { items: TabItem[] }) {
  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cx(
              '-mb-px whitespace-nowrap border-b px-3 py-2 text-sm transition-colors',
              isActive ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink',
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
}

/** Filtro em forma de chips, estilo discreto. */
export function Chips<T extends string>({ options, value, onChange }: ChipProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            'h-8 rounded border px-3 text-[13px] transition-colors',
            o.value === value ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:bg-soft hover:text-ink',
          )}
        >
          {o.label}
          {typeof o.count === 'number' && (
            <span className={cx('ml-1.5 tabular', o.value === value ? 'text-white/70' : 'text-faint')}>{o.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}

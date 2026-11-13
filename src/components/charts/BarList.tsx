import { cx } from '@/lib/cx'

export interface BarRow {
  key: string
  label: string
  value: number
  display: string
  pct?: number
}

interface Props {
  rows: BarRow[]
  color?: string
  emptyText?: string
  className?: string
}

/** Lista com uma barra proporcional sob cada item (distribuição por bandeira da referência). */
export function BarList({ rows, color = '#16A34A', emptyText = 'Sem dados no período', className }: Props) {
  const max = Math.max(0, ...rows.map((r) => r.value))
  if (rows.length === 0) return <p className={cx('py-6 text-center text-[13px] text-muted', className)}>{emptyText}</p>
  return (
    <ul className={cx('space-y-3', className)}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-3 text-[13px]">
            <span className="min-w-0 truncate font-medium text-ink">{r.label}</span>
            <span className="shrink-0 tabular">
              <span className="font-semibold text-ink">{r.display}</span>
              {typeof r.pct === 'number' && (
                <span className="ml-1.5 text-xs text-muted">{r.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%</span>
              )}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full rounded-full bg-rule">
            <div className="h-2 rounded-full" style={{ width: `${max > 0 ? Math.max(1, (r.value / max) * 100) : 0}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

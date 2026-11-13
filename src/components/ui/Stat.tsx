import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'

type Tone = 'ink' | 'accent' | 'ok' | 'warn' | 'danger'

const TONES: Record<Tone, string> = {
  ink: 'text-ink',
  accent: 'text-accent',
  ok: 'text-ok-text',
  warn: 'text-warn-text',
  danger: 'text-danger-text',
}

interface KpiProps {
  icon?: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: Tone
  /** Célula em destaque (fundo azul-claro), como o total principal. */
  highlight?: boolean
  size?: 'md' | 'lg'
  className?: string
}

export function Kpi({ icon: Icon, label, value, hint, tone = 'ink', highlight, size = 'md', className }: KpiProps) {
  return (
    <div className={cx('px-4 py-3.5', highlight ? 'bg-accent-soft' : 'bg-white', className)}>
      <p className="kpi-label">
        {Icon && <Icon size={14} strokeWidth={1.75} className="text-accent" />}
        {label}
      </p>
      <p className={cx('mt-1.5 font-bold leading-none tracking-tight tabular', size === 'lg' ? 'text-[30px]' : 'text-[22px]', highlight ? 'text-accent' : TONES[tone])}>
        {value}
      </p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}

const COLS = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-5',
}

/** Um cartão dividido em células por linhas de 1px (o "Resumo financeiro" da referência). */
export function KpiStrip({ children, cols = 4, className }: { children: ReactNode; cols?: 2 | 3 | 4 | 5; className?: string }) {
  return (
    <div className={cx('card grid grid-cols-1 gap-px overflow-hidden bg-line', COLS[cols], className)}>{children}</div>
  )
}

import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

interface Props {
  label: string
  value: ReactNode
  hint?: ReactNode
  className?: string
}

export function Stat({ label, value, hint, className }: Props) {
  return (
    <div className={cx('panel px-4 py-3.5', className)}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-1 text-xl font-medium tabular tracking-tight">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-faint">{hint}</p>}
    </div>
  )
}

export function StatGrid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const map = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
  }
  return <div className={cx('grid grid-cols-1 gap-3', map[cols])}>{children}</div>
}

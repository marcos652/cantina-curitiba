import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cx } from '@/lib/cx'

interface Props {
  icon?: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({ icon: Icon, title, description, children, compact, className }: Props) {
  return (
    <div className={cx('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-8' : 'px-6 py-16', className)}>
      {Icon && (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-line text-faint">
          <Icon size={18} strokeWidth={1.5} />
        </div>
      )}
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  )
}

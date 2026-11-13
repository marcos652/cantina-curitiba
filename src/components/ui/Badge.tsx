import type { ReactNode } from 'react'
import { cx } from '@/lib/cx'

export type Tone = 'ok' | 'warn' | 'danger' | 'neutral' | 'accent'

const TONES: Record<Tone, string> = {
  ok: 'text-ok-text bg-ok-soft',
  warn: 'text-warn-text bg-warn-soft',
  danger: 'text-danger-text bg-danger-soft',
  neutral: 'text-muted bg-raised',
  accent: 'text-accent bg-accent-soft',
}

const DOTS: Record<Tone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-faint',
  accent: 'bg-accent',
}

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
      <span className={cx('h-1.5 w-1.5 rounded-full', DOTS[tone])} />
      {children}
    </span>
  )
}

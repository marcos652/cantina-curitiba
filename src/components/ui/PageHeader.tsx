import type { ReactNode } from 'react'

interface Props {
  title: string
  description?: ReactNode
  children?: ReactNode
}

export function PageHeader({ title, description, children }: Props) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-xl font-medium tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </div>
  )
}

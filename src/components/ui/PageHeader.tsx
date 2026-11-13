import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

interface Crumb {
  label: string
  to: string
}

interface Props {
  title: string
  description?: ReactNode
  crumbs?: Crumb[]
  children?: ReactNode
}

/** Linha de navegação (início / seção / página) com as ações da página à direita. */
export function PageHeader({ title, description, crumbs = [], children }: Props) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
          <Link to="/" className="flex items-center text-muted hover:text-ink" aria-label="Início">
            <Home size={14} strokeWidth={1.75} />
          </Link>
          <span className="text-faint">/</span>
          {crumbs.map((c) => (
            <span key={c.to} className="flex items-center gap-1.5">
              <Link to={c.to} className="hover:text-ink">
                {c.label}
              </Link>
              <span className="text-faint">/</span>
            </span>
          ))}
          <h1 className="text-[15px] font-semibold text-ink">{title}</h1>
        </div>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}

export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="section-title flex items-center justify-between gap-3">
      <h2>{title}</h2>
      {children}
    </div>
  )
}

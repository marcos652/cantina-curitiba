import { Link, NavLink } from 'react-router-dom'
import { BarChart3, CalendarClock, Croissant, Home, Menu, Package, Settings, ShoppingBag, Wallet, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useStore } from '@/store/useStore'
import { openSession } from '@/store/selectors'
import { Button } from '@/components/ui/Button'

export const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/vencimentos', label: 'Vencimentos', icon: CalendarClock },
  { to: '/caixa', label: 'Caixa', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

function Brand() {
  const name = useStore((s) => s.settings.storeName)
  const logo = useStore((s) => s.settings.logo)
  return (
    <Link to="/" className="flex items-center gap-2">
      {logo ? (
        <img src={logo} alt={`Logo ${name}`} className="h-8 max-w-[96px] object-contain" />
      ) : (
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
          <Croissant size={16} strokeWidth={2} />
        </span>
      )}
      <span className="max-w-[160px] truncate text-sm font-semibold tracking-tight">{name || 'Cantina'}</span>
    </Link>
  )
}

export function CashStatus({ className }: { className?: string }) {
  const sessions = useStore((s) => s.cashSessions)
  const open = Boolean(openSession(sessions))
  return (
    <Link
      to="/caixa"
      className={cx(
        'inline-flex h-8 items-center gap-2 rounded-md border px-2.5 text-xs font-medium transition-colors',
        open ? 'border-ok/30 bg-ok-soft text-ok-text hover:bg-ok-soft' : 'border-line bg-raised text-muted hover:text-ink',
        className,
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', open ? 'bg-ok' : 'bg-faint')} />
      {open ? 'Caixa aberto' : 'Caixa fechado'}
    </Link>
  )
}

export function TopNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white print:hidden">
      <div className="flex h-12 w-full items-center gap-3 px-4 md:px-8">
        <Button variant="ghost" icon onClick={onOpenMenu} aria-label="Abrir menu" className="-ml-2 lg:hidden">
          <Menu size={20} strokeWidth={1.75} />
        </Button>
        <Brand />
        <nav className="ml-4 hidden h-12 items-center lg:flex">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('nav-item', isActive && 'active')}>
              <item.icon size={16} strokeWidth={1.75} className="shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CashStatus />
        </div>
      </div>
    </header>
  )
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cx('fixed inset-0 z-40 print:hidden lg:hidden', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      <div className={cx('absolute inset-0 bg-ink/30 transition-opacity duration-150', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        className={cx(
          'absolute inset-y-0 left-0 flex w-[280px] flex-col bg-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-line px-4">
          <Brand />
          <Button variant="ghost" icon onClick={onClose} aria-label="Fechar menu" className="-mr-2">
            <X size={18} strokeWidth={1.75} />
          </Button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('drawer-item', isActive && 'active')}>
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto border-t border-line p-3">
          <CashStatus className="w-full justify-center" />
        </div>
      </aside>
    </div>
  )
}

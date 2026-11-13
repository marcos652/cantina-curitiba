import { NavLink, Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarClock,
  Home,
  Package,
  PanelLeft,
  PanelLeftClose,
  Settings,
  ShoppingBag,
  Wallet,
  X,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import { useStore } from '@/store/useStore'
import { openSession } from '@/store/selectors'
import { Button } from '@/components/ui/Button'

const NAV = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/vencimentos', label: 'Vencimentos', icon: CalendarClock },
  { to: '/caixa', label: 'Caixa', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

function NavList({ collapsed }: { collapsed: boolean }) {
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          title={collapsed ? item.label : undefined}
          className={({ isActive }) => cx('nav-item', collapsed && 'justify-center px-0', isActive && 'active')}
        >
          <item.icon size={18} strokeWidth={1.5} className="shrink-0" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </NavLink>
      ))}
    </nav>
  )
}

function CashStatus({ collapsed }: { collapsed: boolean }) {
  const sessions = useStore((s) => s.cashSessions)
  const open = Boolean(openSession(sessions))
  return (
    <Link
      to="/caixa"
      title={open ? 'Caixa aberto' : 'Caixa fechado'}
      className={cx('flex h-9 items-center gap-2.5 rounded text-xs text-muted hover:bg-soft', collapsed ? 'justify-center' : 'px-2.5')}
    >
      <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', open ? 'bg-ok' : 'bg-faint')} />
      {!collapsed && <span>{open ? 'Caixa aberto' : 'Caixa fechado'}</span>}
    </Link>
  )
}

function Brand({ collapsed }: { collapsed: boolean }) {
  const name = useStore((s) => s.settings.storeName)
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('')
  return (
    <div className={cx('flex h-14 items-center', collapsed ? 'justify-center' : 'px-4')}>
      {collapsed ? (
        <span className="flex h-7 w-7 items-center justify-center rounded border border-line text-xs font-medium">{initials || 'C'}</span>
      ) : (
        <span className="truncate text-sm font-medium tracking-tight">{name || 'Cantina'}</span>
      )}
    </div>
  )
}

export function DesktopSidebar() {
  const collapsed = useStore((s) => s.sidebarCollapsed)
  const toggle = useStore((s) => s.toggleSidebar)
  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-line bg-white transition-[width] duration-150 md:flex',
        collapsed ? 'w-[60px]' : 'w-[220px]',
      )}
    >
      <Brand collapsed={collapsed} />
      <div className="flex-1 overflow-y-auto py-1">
        <NavList collapsed={collapsed} />
      </div>
      <div className="flex flex-col gap-1 border-t border-line p-2">
        <CashStatus collapsed={collapsed} />
        <Button
          variant="ghost"
          size="md"
          icon={collapsed}
          onClick={toggle}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cx(!collapsed && 'justify-start px-2.5')}
        >
          {collapsed ? <PanelLeft size={18} strokeWidth={1.5} /> : <PanelLeftClose size={18} strokeWidth={1.5} />}
          {!collapsed && <span className="text-xs font-normal">Recolher</span>}
        </Button>
      </div>
    </aside>
  )
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cx('fixed inset-0 z-40 md:hidden', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      <div
        className={cx('absolute inset-0 bg-ink/20 transition-opacity duration-150', open ? 'opacity-100' : 'opacity-0')}
        onClick={onClose}
      />
      <aside
        className={cx(
          'absolute inset-y-0 left-0 flex w-[260px] flex-col border-r border-line bg-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between pr-2">
          <Brand collapsed={false} />
          <Button variant="ghost" icon onClick={onClose} aria-label="Fechar menu">
            <X size={18} strokeWidth={1.5} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          <NavList collapsed={false} />
        </div>
        <div className="border-t border-line p-2">
          <CashStatus collapsed={false} />
        </div>
      </aside>
    </div>
  )
}

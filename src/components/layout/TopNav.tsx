import { Link, NavLink } from 'react-router-dom'
import { BarChart3, CalendarClock, Croissant, Home, LogOut, Menu, Package, Settings, ShoppingBag, Users, Wallet, X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { useStore } from '@/store/useStore'
import { openSession } from '@/store/selectors'
import { Button } from '@/components/ui/Button'
import { useSession } from '@/store/session'
import { logout } from '@/store/boot'

export const NAV: { to: string; label: string; icon: typeof Home; end?: boolean; ownerOnly?: boolean }[] = [
  { to: '/', label: 'Início', icon: Home, end: true },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/vencimentos', label: 'Vencimentos', icon: CalendarClock },
  { to: '/caixa', label: 'Caixa', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/usuarios', label: 'Usuários', icon: Users, ownerOnly: true },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
]

/** Itens do menu: "Usuários" só aparece para o dono. */
function useNav() {
  const role = useSession((s) => s.role)
  return NAV.filter((i) => !i.ownerOnly || role === 'dono')
}

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
        'inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-md border px-2.5 text-xs font-medium transition-colors',
        open ? 'border-ok/30 bg-ok-soft text-ok-text hover:bg-ok-soft' : 'border-line bg-raised text-muted hover:text-ink',
        className,
      )}
    >
      <span className={cx('h-2 w-2 rounded-full', open ? 'bg-ok' : 'bg-faint')} />
      {open ? 'Caixa aberto' : 'Caixa fechado'}
    </Link>
  )
}

const SYNC_LABEL = { ok: 'Dados salvos', syncing: 'Salvando...', offline: 'Sem internet', error: 'Erro ao salvar' } as const
const SYNC_DOT = { ok: 'bg-ok', syncing: 'bg-warn', offline: 'bg-warn', error: 'bg-danger' } as const

function SyncBadge() {
  const sync = useSession((s) => s.sync)
  const memory = useSession((s) => s.memory)
  if (memory) return <span title="Demonstração: nada é salvo" className="hidden h-8 items-center whitespace-nowrap rounded-md bg-warn-soft px-2.5 text-xs font-medium text-warn-text sm:inline-flex">Demonstração</span>
  return (
    <span title={SYNC_LABEL[sync]} className="hidden h-8 items-center gap-2 whitespace-nowrap px-1 text-xs text-muted md:inline-flex">
      <span className={cx('h-2 w-2 rounded-full', SYNC_DOT[sync])} />
      <span className="hidden 2xl:inline">{SYNC_LABEL[sync]}</span>
    </span>
  )
}

function UserMenu() {
  const email = useSession((s) => s.user?.email)
  return (
    <div className="flex items-center gap-1">
      {email && <span className="hidden max-w-[180px] truncate text-xs text-muted 2xl:inline">{email}</span>}
      <Button variant="ghost" size="sm" icon onClick={() => void logout()} title="Sair" aria-label="Sair">
        <LogOut size={16} strokeWidth={1.75} />
      </Button>
    </div>
  )
}

export function TopNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white print:hidden">
      <div className="flex h-12 w-full items-center gap-3 px-4 md:px-8">
        <Button variant="ghost" icon onClick={onOpenMenu} aria-label="Abrir menu" className="-ml-2 xl:hidden">
          <Menu size={20} strokeWidth={1.75} />
        </Button>
        <Brand />
        <nav className="ml-4 hidden h-12 items-center xl:flex">
          {useNav().map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('nav-item', isActive && 'active')}>
              <item.icon size={16} strokeWidth={1.75} className="hidden shrink-0 2xl:block" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <SyncBadge />
          <CashStatus />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}

export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cx('fixed inset-0 z-40 print:hidden xl:hidden', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
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
          {useNav().map((item) => (
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

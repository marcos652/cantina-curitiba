import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3,
  CalendarClock,
  ChevronDown,
  Croissant,
  FileText,
  History,
  Home,
  IdCard,
  ShieldCheck,
  LogOut,
  Menu,
  Package,
  PackageOpen,
  Settings,
  ShoppingBag,
  SlidersHorizontal,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cx } from '@/lib/cx'
import { useStore } from '@/store/useStore'
import { openSession } from '@/store/selectors'
import { Button } from '@/components/ui/Button'
import { useSession } from '@/store/session'
import { logout } from '@/store/boot'
import { accountSlot, accountLabel } from '@/lib/accounts'
import { OtherAccounts } from './OtherAccounts'

interface Leaf {
  to: string
  label: string
  hint: string
  icon: LucideIcon
  end?: boolean
  ownerOnly?: boolean
}

interface Group {
  label: string
  icon: LucideIcon
  /** Caminhos que deixam o grupo marcado como ativo. */
  match: string[]
  items: Leaf[]
}

/** Menu em grupos: cada opção do topo abre os seus itens. */
const GROUPS: Group[] = [
  {
    label: 'Vendas',
    icon: ShoppingBag,
    match: ['/vendas', '/clientes'],
    items: [
      { to: '/vendas', label: 'Nova venda', hint: 'Registrar uma venda no balcão', icon: ShoppingBag, end: true },
      { to: '/vendas/historico', label: 'Histórico de vendas', hint: 'Consultar, abrir e cancelar vendas', icon: History },
      { to: '/clientes', label: 'Clientes e cartões', hint: 'Cartão fidelidade, saldo e pagamentos', icon: IdCard },
    ],
  },
  {
    label: 'Estoque',
    icon: Package,
    match: ['/estoque', '/vencimentos'],
    items: [
      { to: '/estoque', label: 'Produtos', hint: 'Cadastro, preços e saldo', icon: Package, end: true },
      { to: '/estoque/movimentacoes', label: 'Movimentações', hint: 'Entradas, saídas e perdas', icon: PackageOpen },
      { to: '/vencimentos', label: 'Vencimentos', hint: 'Lotes vencidos e vencendo', icon: CalendarClock },
    ],
  },
  {
    label: 'Financeiro',
    icon: Wallet,
    match: ['/caixa', '/extrato', '/relatorios'],
    items: [
      { to: '/caixa', label: 'Caixa', hint: 'Abertura, sangria e fechamento', icon: Wallet },
      { to: '/extrato', label: 'Extrato do dia', hint: 'Resumo do dia para tirar a nota', icon: FileText },
      { to: '/relatorios', label: 'Relatórios', hint: 'Vendas, lucro e perdas', icon: BarChart3 },
    ],
  },
  {
    label: 'Administração',
    icon: Settings,
    match: ['/usuarios', '/acessos', '/configuracoes'],
    items: [
      { to: '/usuarios', label: 'Usuários', hint: 'Acessos da sua equipe', icon: Users, ownerOnly: true },
      { to: '/acessos', label: 'Acessos e LGPD', hint: 'Acesso dos clientes e contratos assinados', icon: ShieldCheck, ownerOnly: true },
      { to: '/configuracoes', label: 'Configurações', hint: 'Nome, logo, taxas e dados', icon: SlidersHorizontal },
    ],
  },
]

/** Grupos visíveis para quem está logado ("Usuários" é só do dono). */
function useGroups(): Group[] {
  const role = useSession((s) => s.role)
  return GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => !i.ownerOnly || role === 'dono') })).filter((g) => g.items.length > 0)
}

function Brand() {
  const name = useStore((s) => s.settings.storeName)
  const logo = useStore((s) => s.settings.logo)
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2">
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
      <span className="hidden xl:inline">{SYNC_LABEL[sync]}</span>
    </span>
  )
}

function UserMenu() {
  const email = useSession((s) => s.user?.email)
  return (
    <div className="flex items-center gap-1">
      {accountSlot && <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">{accountLabel}</span>}
      {email && <span className="hidden max-w-[180px] truncate text-xs text-muted xl:inline">{email}</span>}
      <OtherAccounts />
      <Button variant="ghost" size="sm" icon onClick={() => void logout()} title="Sair" aria-label="Sair">
        <LogOut size={16} strokeWidth={1.75} />
      </Button>
    </div>
  )
}

/** Uma opção do topo com submenu: abre ao passar o mouse ou ao clicar; fecha ao sair, clicar fora ou pressionar Esc. */
function NavGroup({ group }: { group: Group }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const active = group.match.some((p) => pathname === p || pathname.startsWith(p + '/'))

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => {
        clearTimeout(timer.current)
        setOpen(true)
      }}
      onMouseLeave={() => {
        timer.current = setTimeout(() => setOpen(false), 160)
      }}
    >
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(true)} className={cx('nav-item', active && 'active')}>
        <group.icon size={16} strokeWidth={1.75} className="hidden shrink-0 2xl:block" />
        {group.label}
        <ChevronDown size={14} strokeWidth={1.75} className={cx('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 top-full z-50 w-72 rounded-xl border border-line bg-white p-1.5 shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              role="menuitem"
              className={({ isActive }) => cx('flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-raised', isActive && 'bg-accent-soft')}
            >
              <item.icon size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-accent" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink">{item.label}</span>
                <span className="block text-xs text-muted">{item.hint}</span>
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  )
}

export function TopNav({ onOpenMenu }: { onOpenMenu: () => void }) {
  const groups = useGroups()
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white print:hidden">
      <div className="flex h-12 w-full items-center gap-3 px-4 md:px-8">
        <Button variant="ghost" icon onClick={onOpenMenu} aria-label="Abrir menu" className="-ml-2 lg:hidden">
          <Menu size={20} strokeWidth={1.75} />
        </Button>
        <Brand />
        <nav className="ml-4 hidden h-12 items-center lg:flex">
          <NavLink to="/" end className={({ isActive }) => cx('nav-item', isActive && 'active')}>
            <Home size={16} strokeWidth={1.75} className="hidden shrink-0 2xl:block" />
            Início
          </NavLink>
          {groups.map((g) => (
            <NavGroup key={g.label} group={g} />
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
  const groups = useGroups()
  return (
    <div className={cx('fixed inset-0 z-40 print:hidden lg:hidden', open ? '' : 'pointer-events-none')} aria-hidden={!open}>
      <div className={cx('absolute inset-0 bg-ink/30 transition-opacity duration-150', open ? 'opacity-100' : 'opacity-0')} onClick={onClose} />
      <aside
        className={cx(
          'absolute inset-y-0 left-0 flex w-[290px] flex-col bg-white transition-transform duration-200',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4">
          <Brand />
          <Button variant="ghost" icon onClick={onClose} aria-label="Fechar menu" className="-mr-2">
            <X size={18} strokeWidth={1.75} />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2">
          <NavLink to="/" end className={({ isActive }) => cx('drawer-item', isActive && 'active')}>
            <Home size={18} strokeWidth={1.75} />
            Início
          </NavLink>
          {groups.map((g) => (
            <div key={g.label} className="mt-3">
              <p className="px-3 pb-1 text-xs font-medium text-faint">{g.label}</p>
              {g.items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => cx('drawer-item', isActive && 'active')}>
                  <item.icon size={18} strokeWidth={1.75} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="shrink-0 border-t border-line p-3">
          <CashStatus className="w-full justify-center" />
        </div>
      </aside>
    </div>
  )
}

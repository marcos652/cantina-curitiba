import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronRight, Package, Plus, ShoppingBag, TriangleAlert } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { expectedCash, lowStockProducts, openSession, salesOnDay, sumTotal, totalsByMethod } from '@/store/selectors'
import { todayStr } from '@/lib/dates'
import { formatTime, money, num, plural } from '@/lib/format'
import { PAYMENT_LABELS, paymentDescription, round2 } from '@/lib/payments'
import { lotStatus } from '@/lib/stock'
import { Button } from '@/components/ui/Button'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import type { Sale } from '@/types'

export function Home() {
  const navigate = useNavigate()
  const products = useStore((s) => s.products)
  const lots = useStore((s) => s.lots)
  const sales = useStore((s) => s.sales)
  const sessions = useStore((s) => s.cashSessions)
  const settings = useStore((s) => s.settings)
  const loadDemo = useStore((s) => s.loadDemoData)
  const notify = useStore((s) => s.notify)
  const [detail, setDetail] = useState<Sale | null>(null)

  const today = todayStr()
  const todaySales = useMemo(() => salesOnDay(sales, today), [sales, today])
  const total = sumTotal(todaySales)
  const count = todaySales.length
  const ticket = count ? round2(total / count) : 0
  const session = openSession(sessions)
  const cash = session ? expectedCash(session, sales) : null
  const byMethod = totalsByMethod(todaySales).filter((m) => m.count > 0)

  const activeLots = lots.filter((l) => l.quantity > 0)
  const expired = activeLots.filter((l) => lotStatus(l, settings.expiryWarningDays) === 'vencido')
  const expiring = activeLots.filter((l) => lotStatus(l, settings.expiryWarningDays) === 'vencendo')
  const low = lowStockProducts(products, lots)
  const recent = useMemo(() => [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8), [sales])

  const dateLabel = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="Início" description={dateLabel} />
        <div className="panel">
          <EmptyState
            icon={Package}
            title="Comece cadastrando seus produtos"
            description="Depois abra o caixa e registre a primeira venda. Se preferir, carregue dados de exemplo para conhecer o sistema."
          >
            <Button variant="primary" onClick={() => navigate('/estoque?novo=1')}>
              <Plus size={16} strokeWidth={1.5} /> Cadastrar produto
            </Button>
            <Button
              onClick={() => {
                loadDemo()
                notify('Dados de exemplo carregados.')
              }}
            >
              Carregar dados de exemplo
            </Button>
          </EmptyState>
        </div>
      </>
    )
  }

  const alerts = [
    {
      to: '/vencimentos',
      icon: TriangleAlert,
      label: 'Produtos vencidos',
      count: expired.length,
      tone: 'danger' as const,
    },
    {
      to: '/vencimentos',
      icon: CalendarClock,
      label: `Vencendo em até ${settings.expiryWarningDays} dias`,
      count: expiring.length,
      tone: 'warn' as const,
    },
    {
      to: '/estoque',
      icon: Package,
      label: 'Estoque baixo',
      count: low.length,
      tone: 'warn' as const,
    },
  ].filter((a) => a.count > 0)

  return (
    <>
      <PageHeader title="Início" description={dateLabel}>
        <Button variant="primary" size="lg" onClick={() => navigate('/vendas')}>
          <Plus size={18} strokeWidth={1.5} /> Nova venda
        </Button>
      </PageHeader>

      <StatGrid cols={4}>
        <Stat label="Vendido hoje" value={money(total)} />
        <Stat
          label="Em caixa (dinheiro)"
          value={cash === null ? '—' : money(cash)}
          hint={session ? 'Saldo esperado na gaveta' : 'Caixa fechado'}
        />
        <Stat label="Vendas hoje" value={num(count)} />
        <Stat label="Ticket médio" value={money(ticket)} />
      </StatGrid>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <SectionTitle title="Vendas por forma de pagamento" />
          <div className="table-wrap">
            {byMethod.length === 0 ? (
              <EmptyState compact title="Nenhuma venda hoje" description="As vendas do dia aparecem aqui por forma de pagamento." />
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Forma</th>
                    <th className="num">Vendas</th>
                    <th className="num">Bruto</th>
                    <th className="num hidden sm:table-cell">Taxas</th>
                    <th className="num">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {byMethod.map((m) => (
                    <tr key={m.method}>
                      <td>{PAYMENT_LABELS[m.method]}</td>
                      <td className="num">{m.count}</td>
                      <td className="num">{money(m.gross)}</td>
                      <td className="num hidden text-muted sm:table-cell">{m.fees ? `− ${money(m.fees)}` : '—'}</td>
                      <td className="num font-medium">{money(m.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section>
          <SectionTitle title="Alertas" />
          <div className="panel divide-y divide-line">
            {alerts.length === 0 ? (
              <EmptyState compact title="Tudo em dia" description="Nenhum produto vencido, vencendo ou com estoque baixo." />
            ) : (
              alerts.map((a) => (
                <Link
                  key={a.label}
                  to={a.to}
                  className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-soft"
                >
                  <a.icon size={18} strokeWidth={1.5} className="shrink-0 text-muted" />
                  <span className="flex-1">{a.label}</span>
                  <Badge tone={a.tone}>{num(a.count)}</Badge>
                  <ChevronRight size={16} strokeWidth={1.5} className="text-faint" />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <section className="mt-6">
        <SectionTitle title="Últimas vendas">
          <Link to="/vendas/historico" className="text-sm text-muted hover:text-ink">
            Ver histórico
          </Link>
        </SectionTitle>
        <div className="table-wrap">
          {recent.length === 0 ? (
            <EmptyState
              compact
              icon={ShoppingBag}
              title="Nenhuma venda registrada"
              description="Abra o caixa e registre a primeira venda."
            >
              <Button variant="primary" onClick={() => navigate('/vendas')}>
                Nova venda
              </Button>
            </EmptyState>
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Hora</th>
                  <th>Itens</th>
                  <th>Forma</th>
                  <th className="num">Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                    <td className="tabular text-muted">#{s.number}</td>
                    <td className="tabular">{formatTime(s.createdAt)}</td>
                    <td>
                      <span className="block max-w-[140px] truncate sm:max-w-[320px]">
                        {plural(
                          s.items.reduce((a, i) => a + i.quantity, 0),
                          'item',
                          'itens',
                        )}
                        <span className="text-faint"> · {s.items.map((i) => i.name).join(', ')}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap">{paymentDescription(s.payment)}</td>
                    <td className="num font-medium">{money(s.total)}</td>
                    <td className="w-10 text-right">
                      {s.status === 'cancelada' && <Badge tone="danger">Cancelada</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <SaleDetailsModal sale={detail} onClose={() => setDetail(null)} />
    </>
  )
}

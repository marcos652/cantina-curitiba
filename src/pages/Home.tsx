import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarClock, ChevronRight, Coins, Info, Package, PackageX, Percent, Plus, Receipt, ShoppingBag, TrendingUp, TriangleAlert } from 'lucide-react'
import type { Sale } from '@/types'
import { useStore } from '@/store/useStore'
import { expectedCash, lowStockProducts, openSession, salesBetween, sumCost, sumFees, sumTotal, totalsByMethod } from '@/store/selectors'
import { isoInRange } from '@/lib/dates'
import { formatTime, formatDate, money, num, pct, plural } from '@/lib/format'
import { PAYMENT_ICONS, PAYMENT_LABELS, paymentDescription, round2 } from '@/lib/payments'
import { lotStatus, sellableStock } from '@/lib/stock'
import { PRESET_OPTIONS, cumulativePoints, periodLabel, presetRange, salesBuckets, type Preset } from '@/lib/periods'
import { Button } from '@/components/ui/Button'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { Kpi, KpiStrip } from '@/components/ui/Stat'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Chips } from '@/components/ui/Tabs'
import { DateRange } from '@/components/ui/DateRange'
import { AreaChart } from '@/components/charts/AreaChart'
import { StackedBars } from '@/components/charts/StackedBars'
import { BarList } from '@/components/charts/BarList'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'

const SERIES = [
  { name: 'Concluídas', color: '#16A34A' },
  { name: 'Canceladas', color: '#DC2626' },
]

export function Home() {
  const navigate = useNavigate()
  const products = useStore((s) => s.products)
  const lots = useStore((s) => s.lots)
  const sales = useStore((s) => s.sales)
  const sessions = useStore((s) => s.cashSessions)
  const settings = useStore((s) => s.settings)
  const loadDemo = useStore((s) => s.loadDemoData)
  const notify = useStore((s) => s.notify)

  const [preset, setPreset] = useState<Preset>('hoje')
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('hoje'))
  const [detail, setDetail] = useState<Sale | null>(null)

  function applyPreset(p: Preset) {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  const list = useMemo(() => salesBetween(sales, from, to), [sales, from, to])
  const canceled = useMemo(() => sales.filter((s) => s.status === 'cancelada' && isoInRange(s.createdAt, from, to)), [sales, from, to])
  const revenue = sumTotal(list)
  const count = list.length
  const ticket = count ? round2(revenue / count) : 0
  const fees = sumFees(list)
  const cost = sumCost(list)
  const profit = round2(revenue - cost - fees)
  const net = round2(revenue - fees)
  const byMethod = useMemo(() => totalsByMethod(list), [list])
  const singleDay = from === to
  const buckets = useMemo(() => salesBuckets(list, canceled, from, to), [list, canceled, from, to])
  const cumulative = useMemo(() => cumulativePoints(list, singleDay), [list, singleDay])
  const methodRows = byMethod
    .filter((m) => m.count > 0)
    .sort((a, b) => b.gross - a.gross)
    .map((m) => ({ key: m.method, label: PAYMENT_LABELS[m.method], value: m.gross, display: money(m.gross), pct: revenue > 0 ? (m.gross / revenue) * 100 : 0 }))
  const totalAll = count + canceled.length
  const okPct = totalAll > 0 ? (count / totalAll) * 100 : 0

  const session = openSession(sessions)
  const cash = session ? expectedCash(session, sales) : null

  const activeLots = lots.filter((l) => l.quantity > 0)
  const withProduct = (l: (typeof activeLots)[number]) => ({ lot: l, product: products.find((p) => p.id === l.productId) })
  const expired = activeLots.filter((l) => lotStatus(l, settings.expiryWarningDays) === 'vencido').map(withProduct).filter((x) => x.product)
  const expiring = activeLots.filter((l) => lotStatus(l, settings.expiryWarningDays) === 'vencendo').map(withProduct).filter((x) => x.product)
  const low = lowStockProducts(products, lots)
  const recent = useMemo(() => [...sales].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6), [sales])

  if (products.length === 0) {
    return (
      <>
        <PageHeader title="Início" />
        <div className="card">
          <EmptyState
            icon={Package}
            title="Comece cadastrando seus produtos"
            description="Depois abra o caixa e registre a primeira venda. Se preferir, carregue dados de exemplo para conhecer o sistema."
          >
            <Button variant="primary" onClick={() => navigate('/estoque?novo=1')}>
              <Plus size={16} strokeWidth={1.75} /> Cadastrar produto
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

  const alertText =
    expired.length > 0 || expiring.length > 0
      ? [
          expired.length > 0 ? `${plural(expired.length, 'lote vencido', 'lotes vencidos')}` : '',
          expiring.length > 0 ? `${plural(expiring.length, 'lote vencendo', 'lotes vencendo')} em até ${settings.expiryWarningDays} dias` : '',
        ]
          .filter(Boolean)
          .join(' e ')
      : low.length > 0
        ? `${plural(low.length, 'produto', 'produtos')} com estoque baixo`
        : ''

  return (
    <>
      <PageHeader title="Início">
        <Button variant="primary" onClick={() => navigate('/vendas')}>
          <Plus size={16} strokeWidth={1.75} /> Nova venda
        </Button>
      </PageHeader>

      {alertText && (
        <div className="notice mb-4">
          <TriangleAlert size={16} strokeWidth={1.75} className={expired.length > 0 ? 'mt-px shrink-0 text-danger' : 'mt-px shrink-0 text-warn-text'} />
          <span>
            <span className="font-medium">{alertText}.</span>{' '}
            <Link to={expired.length > 0 || expiring.length > 0 ? '/vencimentos' : '/estoque'} className="link">
              {expired.length > 0 || expiring.length > 0 ? 'Ver vencimentos' : 'Ver estoque'} <ChevronRight size={14} />
            </Link>
          </span>
        </div>
      )}

      <div className="card mb-5">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[15px] font-semibold">Visão geral</p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-muted">
              <span>{periodLabel(from, to)}</span>
              <span className="text-faint">·</span>
              {session ? (
                <Link to="/caixa" className="hover:text-ink">
                  Caixa aberto às {formatTime(session.openedAt)} · <span className="font-medium text-ink tabular">{money(cash ?? 0)}</span> na gaveta
                </Link>
              ) : (
                <Link to="/caixa" className="link">
                  Caixa fechado · Abrir caixa
                </Link>
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DateRange
              from={from}
              to={to}
              onChange={(f, t) => {
                setPreset('custom')
                setRange([f, t])
              }}
            />
            <Chips value={preset} onChange={applyPreset} options={PRESET_OPTIONS} />
          </div>
        </div>
      </div>

      <SectionTitle title="Informação sobre as vendas" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="card flex flex-col">
          <div className="flex items-start justify-between gap-3 p-4 pb-0">
            <div>
              <p className="kpi-label">
                Faturamento total <Info size={14} strokeWidth={1.75} className="text-faint" />
              </p>
              <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
                <span className="text-[30px] font-bold leading-none tracking-tight tabular">{money(revenue)}</span>
                <span className="text-[13px] text-muted tabular">{plural(count, 'venda', 'vendas')}</span>
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/vendas/historico')}>
              Detalhar <ChevronRight size={14} strokeWidth={1.75} />
            </Button>
          </div>
          <div className="mt-auto px-2 pb-2 pt-4">
            <AreaChart points={cumulative} />
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <p className="card-title">Meios de pagamento</p>
            <span className="text-xs text-muted">Vendas concluídas no período</span>
          </div>
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {byMethod.map((m) => {
              const Icon = PAYMENT_ICONS[m.method]
              const share = revenue > 0 ? (m.gross / revenue) * 100 : 0
              return (
                <div key={m.method} className="bg-white px-4 py-3.5">
                  <p className="kpi-label">
                    <Icon size={15} strokeWidth={1.75} className="text-accent" />
                    <span className="truncate">{PAYMENT_LABELS[m.method]}</span>
                  </p>
                  <p className={`mt-1.5 text-[20px] font-bold leading-none tracking-tight tabular ${m.count === 0 ? 'text-faint' : ''}`}>{money(m.gross)}</p>
                  <p className="mt-1.5 text-xs text-muted tabular">
                    {plural(m.count, 'venda', 'vendas')} · {pct(share)}
                  </p>
                  <dl className="mt-3 space-y-1 border-t border-rule pt-2.5 text-xs">
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Ticket médio</dt>
                      <dd className="tabular">{money(m.count ? m.gross / m.count : 0)}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-muted">Taxas</dt>
                      <dd className="tabular">{m.fees ? `− ${money(m.fees)}` : '—'}</dd>
                    </div>
                  </dl>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <SectionTitle title="Resumo financeiro" />
      <KpiStrip cols={5}>
        <Kpi icon={Receipt} label="Ticket médio" value={money(ticket)} />
        <Kpi icon={Percent} label="Taxas da maquininha" value={money(fees)} />
        <Kpi icon={Package} label="Custo dos produtos" value={money(cost)} />
        <Kpi icon={TrendingUp} label="Lucro estimado" value={money(profit)} tone={profit < 0 ? 'danger' : 'ink'} />
        <Kpi icon={Coins} label="Líquido a receber" value={money(net)} highlight />
      </KpiStrip>

      <SectionTitle title="Distribuição das vendas" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="card">
          <div className="card-head">
            <p className="card-title">Vendas por {singleDay ? 'hora' : 'dia'}</p>
          </div>
          <div className="card-body">
            <StackedBars data={buckets} series={SERIES} formatY={(v) => (v >= 1000 ? `R$ ${num(Math.round(v / 1000))} mil` : `R$ ${num(Math.round(v))}`)} />
          </div>
          <div className="card-foot">
            <Info size={14} strokeWidth={1.75} className="mt-px shrink-0 text-faint" />
            {totalAll > 0 ? (
              <span>
                No período, <span className="font-medium text-ok-text">{pct(okPct)} das vendas foram concluídas</span>
                {canceled.length > 0 && <> e {pct(100 - okPct)} foram canceladas</>}.
              </span>
            ) : (
              <span>Nenhuma venda registrada no período.</span>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <p className="card-title">Distribuição por forma de pagamento</p>
          </div>
          <div className="card-body">
            <BarList rows={methodRows} emptyText="Nenhuma venda no período" />
          </div>
          <div className="card-foot">
            <Info size={14} strokeWidth={1.75} className="mt-px shrink-0 text-faint" />
            <span>Apenas vendas concluídas entram neste gráfico.</span>
          </div>
        </div>
      </div>

      <SectionTitle title="Estoque e vencimentos" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <AttentionCard
          icon={PackageX}
          title="Vencidos"
          count={expired.length}
          tone="danger"
          to="/vencimentos"
          linkLabel="Ver vencimentos"
          rows={expired.map(({ lot, product }) => ({
            key: lot.id,
            label: product!.name,
            meta: `${num(lot.quantity)} un. · ${formatDate(lot.expiresAt)}`,
            value: money(lot.quantity * product!.costPrice),
          }))}
          empty="Nenhum lote vencido."
        />
        <AttentionCard
          icon={CalendarClock}
          title={`Vencendo em até ${settings.expiryWarningDays} dias`}
          count={expiring.length}
          tone="warn"
          to="/vencimentos"
          linkLabel="Ver vencimentos"
          rows={expiring.map(({ lot, product }) => ({
            key: lot.id,
            label: product!.name,
            meta: `${num(lot.quantity)} un. · ${formatDate(lot.expiresAt)}`,
            value: money(lot.quantity * product!.costPrice),
          }))}
          empty="Nada vencendo nos próximos dias."
        />
        <AttentionCard
          icon={Package}
          title="Estoque baixo"
          count={low.length}
          tone="warn"
          to="/estoque"
          linkLabel="Ver estoque"
          rows={low.map((p) => ({
            key: p.id,
            label: p.name,
            meta: `mínimo ${num(p.minStock)}`,
            value: `${num(sellableStock(lots, p.id))} un.`,
          }))}
          empty="Todos os produtos acima do mínimo."
        />
      </div>

      <SectionTitle title="Últimas vendas">
        <Link to="/vendas/historico" className="link">
          Ver histórico <ChevronRight size={14} />
        </Link>
      </SectionTitle>
      <div className="card table-wrap">
        {recent.length === 0 ? (
          <EmptyState compact icon={ShoppingBag} title="Nenhuma venda registrada" description="Abra o caixa e registre a primeira venda.">
            <Button variant="primary" onClick={() => navigate('/vendas')}>
              Nova venda
            </Button>
          </EmptyState>
        ) : (
          <table className="table hover">
            <thead>
              <tr>
                <th>Nº</th>
                <th>Data</th>
                <th>Itens</th>
                <th>Forma</th>
                <th className="num">Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((s) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => setDetail(s)}>
                  <td className="tabular text-muted">#{s.number}</td>
                  <td className="tabular whitespace-nowrap">
                    {formatDate(s.createdAt)} <span className="text-muted">{formatTime(s.createdAt)}</span>
                  </td>
                  <td>
                    <span className="block max-w-[140px] truncate sm:max-w-[360px]">
                      {plural(
                        s.items.reduce((a, i) => a + i.quantity, 0),
                        'item',
                        'itens',
                      )}
                      <span className="text-muted"> · {s.items.map((i) => i.name).join(', ')}</span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{paymentDescription(s.payment)}</td>
                  <td className="num font-semibold">{money(s.total)}</td>
                  <td>{s.status === 'cancelada' ? <Badge tone="danger">Cancelada</Badge> : <Badge tone="ok">Concluída</Badge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <SaleDetailsModal sale={detail} onClose={() => setDetail(null)} />
    </>
  )
}

interface AttentionRow {
  key: string
  label: string
  meta: string
  value: string
}

function AttentionCard({
  icon: Icon,
  title,
  count,
  tone,
  to,
  linkLabel,
  rows,
  empty,
}: {
  icon: typeof Package
  title: string
  count: number
  tone: 'danger' | 'warn'
  to: string
  linkLabel: string
  rows: AttentionRow[]
  empty: string
}) {
  const shown = rows.slice(0, 3)
  return (
    <div className="card flex flex-col">
      <div className="card-head">
        <p className="card-title flex items-center gap-2">
          <Icon size={16} strokeWidth={1.75} className={count > 0 ? (tone === 'danger' ? 'text-danger' : 'text-warn-text') : 'text-faint'} />
          {title}
        </p>
        <span className={`count-pill ${count > 0 ? (tone === 'danger' ? 'border-danger/30 bg-danger-soft text-danger-text' : 'border-warn/40 bg-warn-soft text-warn-text') : ''}`}>{num(count)}</span>
      </div>
      {shown.length === 0 ? (
        <p className="px-4 py-5 text-[13px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-rule">
          {shown.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
              <span className="min-w-0">
                <span className="block truncate font-medium">{r.label}</span>
                <span className="block text-xs text-muted">{r.meta}</span>
              </span>
              <span className="shrink-0 font-semibold tabular">{r.value}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex items-center justify-between border-t border-line px-4 py-2.5 text-xs text-muted">
        <span>{rows.length > 3 ? `+ ${num(rows.length - 3)} mais` : ''}</span>
        <Link to={to} className="link">
          {linkLabel} <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  )
}

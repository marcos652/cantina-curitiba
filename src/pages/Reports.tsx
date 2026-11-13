import { useMemo, useState } from 'react'
import { BarChart3, FileDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { lossesBetween, salesBetween, sumCost, sumFees, sumTotal, totalsByDay, totalsByMethod, totalsByProduct } from '@/store/selectors'
import { addDays, isoInRange, startOfMonthStr, todayStr } from '@/lib/dates'
import { formatDate, formatDateTime, money, num, pct } from '@/lib/format'
import { PAYMENT_LABELS, round2 } from '@/lib/payments'
import { downloadCSV } from '@/lib/download'
import { Button } from '@/components/ui/Button'
import { DateRange } from '@/components/ui/DateRange'
import { Chips } from '@/components/ui/Tabs'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Stat, StatGrid } from '@/components/ui/Stat'
import { Badge } from '@/components/ui/Badge'

type Preset = 'hoje' | '7' | '30' | 'mes' | 'custom'
type Tab = 'dia' | 'produto' | 'pagamento' | 'perdas'

function presetRange(p: Preset): [string, string] {
  const today = todayStr()
  switch (p) {
    case 'hoje':
      return [today, today]
    case '7':
      return [addDays(today, -6), today]
    case '30':
      return [addDays(today, -29), today]
    case 'mes':
      return [startOfMonthStr(), today]
    default:
      return [today, today]
  }
}

function Bar({ value, max }: { value: number; max: number }) {
  const w = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full min-w-[80px] rounded-full bg-line">
      <div className="h-1.5 rounded-full bg-ink" style={{ width: `${w}%` }} />
    </div>
  )
}

export function Reports() {
  const sales = useStore((s) => s.sales)
  const products = useStore((s) => s.products)
  const movements = useStore((s) => s.movements)

  const [preset, setPreset] = useState<Preset>('7')
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('7'))
  const [tab, setTab] = useState<Tab>('dia')

  function applyPreset(p: Preset) {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  const list = useMemo(() => salesBetween(sales, from, to), [sales, from, to])
  const revenue = sumTotal(list)
  const cost = sumCost(list)
  const fees = sumFees(list)
  const profit = round2(revenue - cost - fees)
  const losses = useMemo(() => lossesBetween(movements, from, to), [movements, from, to])

  const byDay = useMemo(() => totalsByDay(list), [list])
  const byProduct = useMemo(() => totalsByProduct(list), [list])
  const byMethod = useMemo(() => totalsByMethod(list).filter((m) => m.count > 0), [list])
  const unsold = useMemo(() => products.filter((p) => !byProduct.some((r) => r.productId === p.id)), [products, byProduct])
  const lossList = useMemo(
    () =>
      movements
        .filter((m) => (m.type === 'descarte' || m.type === 'perda') && isoInRange(m.createdAt, from, to))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [movements, from, to],
  )

  const top = byProduct.slice(0, 5)
  const bottom = byProduct.length > 5 ? [...byProduct].slice(-5).reverse() : []
  const maxQty = byProduct[0]?.quantity ?? 0

  function exportCSV() {
    const name = `relatorio_${tab}_${from}_${to}.csv`
    if (tab === 'dia') {
      downloadCSV(name, [['Data', 'Vendas', 'Bruto', 'Taxas', 'Líquido'], ...byDay.map((d) => [formatDate(d.date), d.count, d.total, d.fees, d.net])])
    } else if (tab === 'produto') {
      downloadCSV(name, [['Produto', 'Qtd', 'Receita', 'Custo', 'Lucro'], ...byProduct.map((p) => [p.name, p.quantity, p.revenue, p.cost, p.profit])])
    } else if (tab === 'pagamento') {
      downloadCSV(name, [['Forma', 'Vendas', 'Bruto', 'Taxas', 'Líquido'], ...byMethod.map((m) => [PAYMENT_LABELS[m.method], m.count, m.gross, m.fees, m.net])])
    } else {
      downloadCSV(name, [
        ['Data', 'Produto', 'Tipo', 'Qtd', 'Valor'],
        ...lossList.map((m) => [formatDateTime(m.createdAt), m.productName, m.type === 'descarte' ? 'Descarte' : 'Perda', Math.abs(m.quantity), round2(Math.abs(m.quantity) * m.unitCost)]),
      ])
    }
  }

  const periodLabel = from === to ? formatDate(from) : `${formatDate(from)} a ${formatDate(to)}`

  return (
    <>
      <PageHeader title="Relatórios" description={periodLabel}>
        <Button onClick={exportCSV}>
          <FileDown size={16} strokeWidth={1.5} /> Exportar CSV
        </Button>
      </PageHeader>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Chips
          value={preset}
          onChange={applyPreset}
          options={[
            { value: 'hoje', label: 'Hoje' },
            { value: '7', label: '7 dias' },
            { value: '30', label: '30 dias' },
            { value: 'mes', label: 'Este mês' },
            { value: 'custom', label: 'Personalizado' },
          ]}
        />
        <DateRange
          from={from}
          to={to}
          onChange={(f, t) => {
            setPreset('custom')
            setRange([f, t])
          }}
        />
      </div>

      <StatGrid cols={5}>
        <Stat label="Receita bruta" value={money(revenue)} hint={`${num(list.length)} ${list.length === 1 ? 'venda' : 'vendas'}`} />
        <Stat label="Custo dos produtos" value={money(cost)} />
        <Stat label="Taxas de cartão" value={money(fees)} />
        <Stat label="Lucro estimado" value={money(profit)} hint="Receita − custo − taxas" />
        <Stat label="Perdas por vencimento" value={money(losses.descarte.value)} hint={`${num(losses.descarte.quantity)} un. descartadas`} />
      </StatGrid>

      <div className="mb-4 mt-8">
        <Chips
          value={tab}
          onChange={setTab}
          options={[
            { value: 'dia', label: 'Por dia' },
            { value: 'produto', label: 'Por produto' },
            { value: 'pagamento', label: 'Por pagamento' },
            { value: 'perdas', label: 'Perdas' },
          ]}
        />
      </div>

      {tab === 'dia' && (
        <div className="table-wrap">
          {byDay.length === 0 ? (
            <EmptyState icon={BarChart3} title="Nenhuma venda no período" description="Escolha outro período para ver os totais por dia." />
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Data</th>
                  <th className="num">Vendas</th>
                  <th className="num">Bruto</th>
                  <th className="num">Taxas</th>
                  <th className="num">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {byDay.map((d) => (
                  <tr key={d.date}>
                    <td className="tabular">{formatDate(d.date)}</td>
                    <td className="num">{d.count}</td>
                    <td className="num font-medium">{money(d.total)}</td>
                    <td className="num text-muted">{d.fees ? `− ${money(d.fees)}` : '—'}</td>
                    <td className="num">{money(d.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'produto' && (
        <>
          {byProduct.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <section>
                <SectionTitle title="Mais vendidos" />
                <ol className="panel divide-y divide-line">
                  {top.map((p, i) => (
                    <li key={p.productId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-4 text-xs text-faint tabular">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-muted tabular">{num(p.quantity)} un.</span>
                    </li>
                  ))}
                </ol>
              </section>
              <section>
                <SectionTitle title="Menos vendidos" />
                <ol className="panel divide-y divide-line">
                  {bottom.map((p) => (
                    <li key={p.productId} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <span className="text-muted tabular">{num(p.quantity)} un.</span>
                    </li>
                  ))}
                  {unsold.slice(0, Math.max(0, 5 - bottom.length)).map((p) => (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 flex-1 truncate">{p.name}</span>
                      <Badge tone="neutral">Sem vendas</Badge>
                    </li>
                  ))}
                  {bottom.length === 0 && unsold.length === 0 && (
                    <li className="px-4 py-2.5 text-sm text-faint">Todos os produtos aparecem na lista ao lado.</li>
                  )}
                </ol>
              </section>
            </div>
          )}
          <div className="table-wrap">
            {byProduct.length === 0 ? (
              <EmptyState icon={BarChart3} title="Nenhuma venda no período" description="Escolha outro período para ver as vendas por produto." />
            ) : (
              <table className="table hover">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="num">Qtd</th>
                    <th className="w-32">Participação</th>
                    <th className="num">Receita</th>
                    <th className="num">Custo</th>
                    <th className="num">Lucro</th>
                    <th className="num">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {byProduct.map((p) => (
                    <tr key={p.productId}>
                      <td className="font-medium">{p.name}</td>
                      <td className="num">{num(p.quantity)}</td>
                      <td>
                        <Bar value={p.quantity} max={maxQty} />
                      </td>
                      <td className="num">{money(p.revenue)}</td>
                      <td className="num text-muted">{money(p.cost)}</td>
                      <td className="num font-medium">{money(p.profit)}</td>
                      <td className="num text-muted">{p.revenue > 0 ? pct((p.profit / p.revenue) * 100) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'pagamento' && (
        <div className="table-wrap">
          {byMethod.length === 0 ? (
            <EmptyState icon={BarChart3} title="Nenhuma venda no período" description="Escolha outro período para ver as formas de pagamento." />
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Forma</th>
                  <th className="num">Vendas</th>
                  <th className="w-32">Participação</th>
                  <th className="num">Bruto</th>
                  <th className="num">Taxas</th>
                  <th className="num">Líquido</th>
                </tr>
              </thead>
              <tbody>
                {byMethod.map((m) => (
                  <tr key={m.method}>
                    <td className="font-medium">{PAYMENT_LABELS[m.method]}</td>
                    <td className="num">{m.count}</td>
                    <td>
                      <Bar value={m.gross} max={revenue} />
                    </td>
                    <td className="num">{money(m.gross)}</td>
                    <td className="num text-muted">{m.fees ? `− ${money(m.fees)}` : '—'}</td>
                    <td className="num font-medium">{money(m.net)}</td>
                  </tr>
                ))}
                <tr className="bg-soft font-medium">
                  <td>Total</td>
                  <td className="num">{list.length}</td>
                  <td></td>
                  <td className="num">{money(revenue)}</td>
                  <td className="num">{fees ? `− ${money(fees)}` : '—'}</td>
                  <td className="num">{money(round2(revenue - fees))}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'perdas' && (
        <>
          <StatGrid cols={2}>
            <Stat label="Descartes por vencimento" value={money(losses.descarte.value)} hint={`${num(losses.descarte.quantity)} un.`} />
            <Stat label="Outras perdas" value={money(losses.perda.value)} hint={`${num(losses.perda.quantity)} un.`} />
          </StatGrid>
          <div className="table-wrap mt-4">
            {lossList.length === 0 ? (
              <EmptyState icon={BarChart3} title="Nenhuma perda no período" description="Descartes e perdas registrados no estoque aparecem aqui." />
            ) : (
              <table className="table hover">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Produto</th>
                    <th>Tipo</th>
                    <th className="num">Qtd</th>
                    <th className="num">Valor em custo</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {lossList.map((m) => (
                    <tr key={m.id}>
                      <td className="tabular whitespace-nowrap text-muted">{formatDateTime(m.createdAt)}</td>
                      <td className="font-medium">{m.productName}</td>
                      <td>
                        <Badge tone="danger">{m.type === 'descarte' ? 'Descarte' : 'Perda'}</Badge>
                      </td>
                      <td className="num">{num(Math.abs(m.quantity))}</td>
                      <td className="num">{money(Math.abs(m.quantity) * m.unitCost)}</td>
                      <td className="max-w-[240px] truncate text-muted">{m.note ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  )
}

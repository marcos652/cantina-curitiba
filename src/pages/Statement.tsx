import { useMemo, useState } from 'react'
import { FileDown, Printer } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { expectedCash, sessionSales, sumCost, sumFees, sumNet, sumTotal, totalsByMethod, totalsByProduct } from '@/store/selectors'
import { isoToDateStr, todayStr } from '@/lib/dates'
import { formatDate, formatDateTime, formatTime, money, num, pct } from '@/lib/format'
import { PAYMENT_LABELS, paymentDescription, round2 } from '@/lib/payments'
import { downloadCSV } from '@/lib/download'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Kpi, KpiStrip } from '@/components/ui/Stat'

function Block({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <section className="card break-inside-avoid print:shadow-none">
      <div className="card-head">
        <p className="card-title">{title}</p>
        {note && <span className="text-xs text-muted">{note}</span>}
      </div>
      {children}
    </section>
  )
}

export function Statement() {
  const sales = useStore((s) => s.sales)
  const sessions = useStore((s) => s.cashSessions)
  const settings = useStore((s) => s.settings)
  const [day, setDay] = useState(todayStr())

  const daySales = useMemo(() => sales.filter((s) => isoToDateStr(s.createdAt) === day).sort((a, b) => a.createdAt.localeCompare(b.createdAt)), [sales, day])
  const done = daySales.filter((s) => s.status === 'concluida')
  const canceled = daySales.filter((s) => s.status === 'cancelada')
  const gross = sumTotal(done)
  const fees = sumFees(done)
  const net = sumNet(done)
  const cost = sumCost(done)
  const profit = round2(gross - cost - fees)
  const ticket = done.length ? round2(gross / done.length) : 0
  const byMethod = useMemo(() => totalsByMethod(done).filter((m) => m.count > 0), [done])
  const byProduct = useMemo(() => totalsByProduct(done), [done])
  const itemsCount = byProduct.reduce((a, p) => a + p.quantity, 0)

  const cashRows = useMemo(
    () =>
      sessions
        .filter((c) => isoToDateStr(c.openedAt) === day)
        .sort((a, b) => a.openedAt.localeCompare(b.openedAt))
        .map((c) => {
          const list = sessionSales(sales, c.id)
          const cashSales = sumTotal(list.filter((s) => s.payment.method === 'dinheiro'))
          const reinforcements = round2(c.movements.filter((m) => m.type === 'reforco').reduce((a, m) => a + m.amount, 0))
          const withdrawals = round2(c.movements.filter((m) => m.type === 'sangria').reduce((a, m) => a + m.amount, 0))
          const expected = c.status === 'fechado' ? (c.expectedAmount ?? 0) : expectedCash(c, sales)
          const counted = c.status === 'fechado' ? (c.countedAmount ?? 0) : null
          return { c, cashSales, reinforcements, withdrawals, expected, counted, diff: counted === null ? null : round2(counted - expected) }
        }),
    [sessions, sales, day],
  )

  const title = `Extrato do dia ${formatDate(day)}`

  function exportCSV() {
    const rows: Array<Array<string | number>> = [
      [settings.storeName],
      [title],
      [],
      ['Resumo'],
      ['Vendas concluídas', done.length],
      ['Vendas canceladas', canceled.length],
      ['Faturamento bruto', gross],
      ['Taxas da maquininha', fees],
      ['Líquido a receber', net],
      ['Ticket médio', ticket],
      [],
      ['Forma de pagamento', 'Vendas', 'Bruto', 'Taxas', 'Líquido'],
      ...byMethod.map((m) => [PAYMENT_LABELS[m.method], m.count, m.gross, m.fees, m.net]),
      [],
      ['Produto', 'Quantidade', 'Valor vendido'],
      ...byProduct.map((p) => [p.name, p.quantity, p.revenue]),
      [],
      ['Caixa', 'Abertura', 'Vendas em dinheiro', 'Reforços', 'Sangrias', 'Esperado', 'Contado', 'Diferença'],
      ...cashRows.map((r) => [formatTime(r.c.openedAt), r.c.openingAmount, r.cashSales, r.reinforcements, r.withdrawals, r.expected, r.counted ?? '', r.diff ?? '']),
      [],
      ['Nº', 'Hora', 'Itens', 'Forma', 'NSU', 'Total', 'Status'],
      ...daySales.map((s) => [s.number, formatTime(s.createdAt), s.items.map((i) => `${i.quantity}x ${i.name}`).join(', '), paymentDescription(s.payment), s.payment.nsu ?? '', s.total, s.status === 'concluida' ? 'Concluída' : 'Cancelada']),
    ]
    downloadCSV(`extrato_${day}.csv`, rows)
  }

  return (
    <>
      <div className="print:hidden">
        <PageHeader title="Extrato do dia" crumbs={[{ label: 'Caixa', to: '/caixa' }]}>
          <Button onClick={exportCSV} disabled={daySales.length === 0 && cashRows.length === 0}>
            <FileDown size={16} strokeWidth={1.75} /> Exportar CSV
          </Button>
          <Button variant="primary" onClick={() => window.print()}>
            <Printer size={16} strokeWidth={1.75} /> Imprimir ou salvar PDF
          </Button>
        </PageHeader>

        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <Field label="Dia do extrato" className="w-48">
            <Input type="date" value={day} max={todayStr()} onChange={(e) => e.target.value && setDay(e.target.value)} />
          </Field>
          <Button onClick={() => setDay(todayStr())} disabled={day === todayStr()}>
            Hoje
          </Button>
          <p className="ml-auto max-w-md text-xs text-muted">Resumo para conferência e para emitir a nota. Não é um documento fiscal.</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-4 print:shadow-none">
          <div className="flex items-center gap-3">
            {settings.logo && <img src={settings.logo} alt="" className="h-10 max-w-[120px] object-contain" />}
            <div>
              <p className="text-base font-semibold leading-tight">{settings.storeName || 'Cantina'}</p>
              <p className="text-sm text-muted">{title}</p>
            </div>
          </div>
          <p className="text-xs text-muted">Emitido em {formatDateTime(new Date().toISOString())}</p>
        </div>

        {daySales.length === 0 && cashRows.length === 0 ? (
          <div className="card">
            <EmptyState title="Nada registrado neste dia" description="Escolha outra data para ver o extrato de vendas e do caixa." />
          </div>
        ) : (
          <>
            <KpiStrip cols={4} className="print:shadow-none">
              <Kpi label="Vendas concluídas" value={num(done.length)} hint={canceled.length ? `${num(canceled.length)} cancelada${canceled.length > 1 ? 's' : ''}` : `${num(itemsCount)} itens vendidos`} />
              <Kpi label="Faturamento bruto" value={money(gross)} hint={`Ticket médio ${money(ticket)}`} />
              <Kpi label="Taxas da maquininha" value={money(fees)} hint={`Lucro estimado ${money(profit)}`} />
              <Kpi label="Líquido a receber" value={money(net)} highlight />
            </KpiStrip>

            <Block title="Por forma de pagamento">
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Forma</th>
                      <th className="num">Vendas</th>
                      <th className="num">Bruto</th>
                      <th className="num">Taxas</th>
                      <th className="num">Líquido</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMethod.map((m) => (
                      <tr key={m.method}>
                        <td>{PAYMENT_LABELS[m.method]}</td>
                        <td className="num">{m.count}</td>
                        <td className="num">{money(m.gross)}</td>
                        <td className="num text-muted">{m.fees ? `− ${money(m.fees)}` : '—'}</td>
                        <td className="num font-medium">{money(m.net)}</td>
                      </tr>
                    ))}
                    <tr className="bg-raised font-semibold">
                      <td>Total</td>
                      <td className="num">{done.length}</td>
                      <td className="num">{money(gross)}</td>
                      <td className="num">{fees ? `− ${money(fees)}` : '—'}</td>
                      <td className="num">{money(net)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Block>

            <Block title="O que foi vendido" note={`${num(itemsCount)} itens`}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th className="num">Quantidade</th>
                      <th className="num">Valor vendido</th>
                      <th className="num">Participação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byProduct.map((p) => (
                      <tr key={p.productId}>
                        <td className="font-medium">{p.name}</td>
                        <td className="num">{num(p.quantity)}</td>
                        <td className="num">{money(p.revenue)}</td>
                        <td className="num text-muted">{gross > 0 ? pct((p.revenue / gross) * 100) : '—'}</td>
                      </tr>
                    ))}
                    {byProduct.length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted">
                          Nenhuma venda concluída neste dia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Block>

            <Block title="Caixa" note={cashRows.length > 1 ? `${cashRows.length} caixas no dia` : undefined}>
              {cashRows.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-muted">Nenhum caixa foi aberto neste dia.</p>
              ) : (
                <div className="divide-y divide-rule">
                  {cashRows.map((r) => (
                    <div key={r.c.id} className="px-4 py-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-medium">
                          Aberto às {formatTime(r.c.openedAt)}
                          {r.c.closedAt ? ` · fechado às ${formatTime(r.c.closedAt)}` : ''}
                        </p>
                        {r.c.status === 'aberto' ? (
                          <Badge tone="warn">Ainda aberto</Badge>
                        ) : r.diff === 0 ? (
                          <Badge tone="ok">Conferido</Badge>
                        ) : (r.diff ?? 0) < 0 ? (
                          <Badge tone="danger">Falta {money(-(r.diff ?? 0))}</Badge>
                        ) : (
                          <Badge tone="warn">Sobra {money(r.diff ?? 0)}</Badge>
                        )}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
                        {[
                          ['Abertura', money(r.c.openingAmount)],
                          ['Vendas em dinheiro', money(r.cashSales)],
                          ['Reforços', money(r.reinforcements)],
                          ['Sangrias', money(r.withdrawals)],
                          ['Esperado na gaveta', money(r.expected)],
                          ['Contado', r.counted === null ? '—' : money(r.counted)],
                        ].map(([k, v]) => (
                          <div key={k}>
                            <dt className="text-xs text-muted">{k}</dt>
                            <dd className="mt-0.5 font-semibold tabular">{v}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              )}
            </Block>

            <Block title="Vendas do dia" note={`${num(daySales.length)} registros`}>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nº</th>
                      <th>Hora</th>
                      <th>Itens</th>
                      <th>Forma</th>
                      <th>NSU</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daySales.map((s) => (
                      <tr key={s.id} className={s.status === 'cancelada' ? 'text-faint line-through' : ''}>
                        <td className="tabular">#{s.number}</td>
                        <td className="tabular">{formatTime(s.createdAt)}</td>
                        <td>{s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</td>
                        <td className="whitespace-nowrap">{paymentDescription(s.payment)}</td>
                        <td className="tabular">{s.payment.nsu ?? '—'}</td>
                        <td className="num font-medium">{money(s.total)}</td>
                      </tr>
                    ))}
                    {daySales.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center text-muted">
                          Nenhuma venda neste dia.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {canceled.length > 0 && <p className="border-t border-line px-4 py-2.5 text-xs text-muted">Vendas riscadas foram canceladas e não entram nos totais.</p>}
            </Block>
          </>
        )}
      </div>
    </>
  )
}

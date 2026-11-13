import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Ban, Printer, ShoppingBag } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { addDays, isoToDateStr } from '@/lib/dates'
import { formatDate, formatDateTime, money, num, pct } from '@/lib/format'
import { PAYMENT_ICONS, PAYMENT_LABELS, calcFee, round2 } from '@/lib/payments'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'

function Row({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right tabular ${strong ? 'font-semibold' : ''}`}>{value}</dd>
    </div>
  )
}

function InfoCard({ title, children, highlight }: { title?: ReactNode; children: ReactNode; highlight?: boolean }) {
  return (
    <section className={`card px-4 py-4 print:shadow-none ${highlight ? 'bg-accent-soft/50' : ''}`}>
      {title && <div className="mb-2 text-[13px] font-semibold text-muted">{title}</div>}
      <dl className="divide-y divide-rule">{children}</dl>
    </section>
  )
}

export function SaleDetail() {
  const { id } = useParams()
  const sale = useStore((s) => s.sales.find((x) => x.id === id))
  const session = useStore((s) => s.cashSessions.find((c) => c.id === sale?.cashSessionId))
  const storeName = useStore((s) => s.settings.storeName)
  const cancelSale = useStore((s) => s.cancelSale)
  const notify = useStore((s) => s.notify)
  const [confirm, setConfirm] = useState(false)

  if (!sale) {
    return (
      <>
        <PageHeader title="Venda" crumbs={[{ label: 'Vendas', to: '/vendas/historico' }]} />
        <div className="card">
          <EmptyState icon={ShoppingBag} title="Venda não encontrada" description="Ela pode ter sido apagada junto com os dados do sistema.">
            <Link to="/vendas/historico" className="btn btn-primary btn-md">
              Voltar ao histórico
            </Link>
          </EmptyState>
        </div>
      </>
    )
  }

  const p = sale.payment
  const cancelled = sale.status === 'cancelada'
  const Icon = PAYMENT_ICONS[p.method]
  const qty = sale.items.reduce((a, i) => a + i.quantity, 0)

  // Previsão de recebimento: uma parcela a cada 30 dias, a última absorve os centavos.
  const installments = p.method === 'credito_parcelado' ? (p.installments ?? 1) : 0
  const base = installments ? round2(sale.total / installments) : 0
  let feeSoFar = 0
  const schedule = Array.from({ length: installments }, (_, i) => {
    const last = i === installments - 1
    const value = last ? round2(sale.total - base * (installments - 1)) : base
    const feeValue = last ? round2(p.feeValue - feeSoFar) : calcFee(value, p.feePercent).feeValue
    feeSoFar = round2(feeSoFar + feeValue)
    return { n: i + 1, date: addDays(isoToDateStr(sale.createdAt), 30 * (i + 1)), value, feeValue, net: round2(value - feeValue) }
  })

  return (
    <>
      <div className="mb-4 hidden print:block">
        <p className="text-base font-semibold">{storeName}</p>
        <p className="text-sm text-muted">Comprovante da venda #{sale.number}</p>
      </div>

      <div className="print:hidden">
        <PageHeader title={`Venda #${sale.number}`} crumbs={[{ label: 'Vendas', to: '/vendas/historico' }]}>
          <Button onClick={() => window.print()}>
            <Printer size={16} strokeWidth={1.75} /> Comprovante
          </Button>
          {!cancelled && (
            <Button variant="danger" onClick={() => setConfirm(true)}>
              <Ban size={16} strokeWidth={1.75} /> Cancelar venda
            </Button>
          )}
        </PageHeader>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard title="Estabelecimento">
            <Row label="Nome" value={storeName} strong />
            <Row label="Venda" value={`#${sale.number}`} />
            <Row label="Caixa aberto em" value={session ? formatDateTime(session.openedAt) : '—'} />
          </InfoCard>

          <InfoCard
            title={
              <span className="flex items-center gap-2 text-ink">
                <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent">
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                {PAYMENT_LABELS[p.method]}
              </span>
            }
          >
            <Row label="NSU" value={p.nsu ?? 'Não informado'} />
            <Row label="Parcelas" value={p.installments ? `${p.installments}x` : '1x'} />
            {p.method === 'dinheiro' && typeof p.received === 'number' ? (
              <>
                <Row label="Valor recebido" value={money(p.received)} />
                <Row label="Troco" value={money(p.change ?? 0)} />
              </>
            ) : (
              <Row label="Taxa aplicada" value={pct(p.feePercent)} />
            )}
          </InfoCard>

          <InfoCard
            title={
              <span className="flex items-center justify-between">
                Situação {cancelled ? <Badge tone="danger">Cancelada</Badge> : <Badge tone="ok">Concluída</Badge>}
              </span>
            }
          >
            <Row label="Realizada em" value={formatDateTime(sale.createdAt)} />
            <Row label="Cancelada em" value={sale.canceledAt ? formatDateTime(sale.canceledAt) : '—'} />
            <Row label="Itens" value={`${num(qty)} ${qty === 1 ? 'unidade' : 'unidades'}`} />
          </InfoCard>

          <InfoCard title="Valores" highlight>
            <Row label="Valor da venda" value={money(sale.total)} strong />
            <Row label={`Taxa (${pct(p.feePercent)})`} value={p.feeValue ? `− ${money(p.feeValue)}` : money(0)} />
            <Row label="Líquido a receber" value={<span className="text-accent">{money(p.net)}</span>} strong />
          </InfoCard>
        </div>

        <section className="card print:shadow-none">
          <div className="card-head">
            <p className="card-title">Itens da venda</p>
            <span className="text-xs text-muted">{num(qty)} un.</span>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="num">Quantidade</th>
                  <th className="num">Valor unitário</th>
                  <th className="num">Total</th>
                  <th>Lote (validade)</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((i) => (
                  <tr key={i.productId}>
                    <td className="font-medium">{i.name}</td>
                    <td className="num">{num(i.quantity)}</td>
                    <td className="num text-muted">{money(i.unitPrice)}</td>
                    <td className="num font-semibold">{money(i.unitPrice * i.quantity)}</td>
                    <td className="tabular text-muted">{i.lots.map((l) => formatDate(l.expiresAt)).join(', ')}</td>
                  </tr>
                ))}
                <tr className="bg-raised font-semibold">
                  <td>Total</td>
                  <td className="num">{num(qty)}</td>
                  <td></td>
                  <td className="num">{money(sale.total)}</td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {schedule.length > 0 && (
          <section className="card break-inside-avoid print:shadow-none">
            <div className="card-head">
              <p className="card-title">Parcelas da venda</p>
              <span className="text-xs text-muted">Previsão, uma parcela a cada 30 dias</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Parcela</th>
                    <th>Pagamento previsto</th>
                    <th className="num">Valor</th>
                    <th className="num">Taxa</th>
                    <th className="num">A receber</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r) => (
                    <tr key={r.n}>
                      <td className="tabular">
                        {r.n} / {installments}
                      </td>
                      <td className="tabular">{formatDate(r.date)}</td>
                      <td className="num">{money(r.value)}</td>
                      <td className="num text-muted">{r.feeValue ? `− ${money(r.feeValue)}` : '—'}</td>
                      <td className="num font-semibold">{money(r.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => {
          const r = cancelSale(sale.id)
          if (!r.ok) return notify(r.error, 'error')
          notify(`Venda #${sale.number} cancelada. Estoque devolvido.`)
        }}
        title={`Cancelar venda #${sale.number}?`}
        message="Os produtos voltam para o estoque e a venda deixa de contar no caixa e nos relatórios."
        confirmLabel="Cancelar venda"
        danger
      />
    </>
  )
}

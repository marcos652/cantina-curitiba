import { useMemo, useState } from 'react'
import { Ban, Coins, Eye, FileDown, Receipt, ShoppingBag } from 'lucide-react'
import type { PaymentMethod, Sale } from '@/types'
import { useStore } from '@/store/useStore'
import { sumNet, sumTotal } from '@/store/selectors'
import { isoInRange } from '@/lib/dates'
import { formatDateTime, money, num } from '@/lib/format'
import { PAYMENT_LABELS, PAYMENT_METHODS, paymentDescription } from '@/lib/payments'
import { PRESET_OPTIONS, presetRange, type Preset } from '@/lib/periods'
import { downloadCSV } from '@/lib/download'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { DateRange } from '@/components/ui/DateRange'
import { Chips, Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Kpi, KpiStrip } from '@/components/ui/Stat'
import { ConfirmDialog } from '@/components/ui/Modal'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import { SALES_TABS } from './Sales'

export function SalesHistory() {
  const sales = useStore((s) => s.sales)
  const cancelSale = useStore((s) => s.cancelSale)
  const notify = useStore((s) => s.notify)

  const [preset, setPreset] = useState<Preset>('7')
  const [[from, to], setRange] = useState<[string, string]>(() => presetRange('7'))
  const [method, setMethod] = useState<'todas' | PaymentMethod>('todas')
  const [status, setStatus] = useState<'todas' | 'concluida' | 'cancelada'>('todas')
  const [detail, setDetail] = useState<Sale | null>(null)
  const [toCancel, setToCancel] = useState<Sale | null>(null)

  function applyPreset(p: Preset) {
    setPreset(p)
    if (p !== 'custom') setRange(presetRange(p))
  }

  const list = useMemo(
    () =>
      sales
        .filter(
          (s) =>
            (!from || !to || isoInRange(s.createdAt, from, to)) &&
            (method === 'todas' || s.payment.method === method) &&
            (status === 'todas' || s.status === status),
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [sales, from, to, method, status],
  )
  const completedList = list.filter((s) => s.status === 'concluida')

  function exportCSV() {
    downloadCSV(`vendas_${from}_${to}.csv`, [
      ['Nº', 'Data', 'Itens', 'Forma', 'Total', 'Taxa', 'Líquido', 'Status'],
      ...list.map((s) => [
        s.number,
        formatDateTime(s.createdAt),
        s.items.map((i) => `${i.quantity}x ${i.name}`).join(', '),
        paymentDescription(s.payment),
        s.total,
        s.payment.feeValue,
        s.payment.net,
        s.status === 'concluida' ? 'Concluída' : 'Cancelada',
      ]),
    ])
  }

  function confirmCancel() {
    if (!toCancel) return
    const r = cancelSale(toCancel.id)
    if (!r.ok) return notify(r.error, 'error')
    notify(`Venda #${toCancel.number} cancelada. Estoque devolvido.`)
  }

  return (
    <>
      <PageHeader title="Vendas">
        <Button onClick={exportCSV} disabled={list.length === 0}>
          <FileDown size={16} strokeWidth={1.75} /> Exportar CSV
        </Button>
      </PageHeader>
      <Tabs items={SALES_TABS} />

      <div className="card mb-4">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Período">
              <DateRange
                from={from}
                to={to}
                onChange={(f, t) => {
                  setPreset('custom')
                  setRange([f, t])
                }}
              />
            </Field>
            <Field label="Forma de pagamento" className="w-44">
              <Select value={method} onChange={(e) => setMethod(e.target.value as typeof method)}>
                <option value="todas">Todas</option>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {PAYMENT_LABELS[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Status" className="w-36">
              <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
                <option value="todas">Todas</option>
                <option value="concluida">Concluídas</option>
                <option value="cancelada">Canceladas</option>
              </Select>
            </Field>
          </div>
          <Chips value={preset} onChange={applyPreset} options={PRESET_OPTIONS} />
        </div>
      </div>

      <KpiStrip cols={3} className="mb-4">
        <Kpi icon={ShoppingBag} label="Vendas concluídas" value={num(completedList.length)} hint={list.length !== completedList.length ? `${num(list.length - completedList.length)} canceladas no filtro` : undefined} />
        <Kpi icon={Receipt} label="Valor bruto" value={money(sumTotal(completedList))} />
        <Kpi icon={Coins} label="Valor líquido" value={money(sumNet(completedList))} highlight />
      </KpiStrip>

      <div className="card">
        <div className="card-head">
          <p className="card-title flex items-center gap-2">
            Vendas <span className="count-pill">{num(list.length)}</span>
          </p>
        </div>
        <div className="table-wrap">
          {list.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Nenhuma venda no período" description="Ajuste o período ou os filtros para ver outras vendas." />
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Data</th>
                  <th>Itens</th>
                  <th>Forma</th>
                  <th className="num">Total</th>
                  <th className="num">Líquido</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular text-muted">#{s.number}</td>
                    <td className="tabular whitespace-nowrap">{formatDateTime(s.createdAt)}</td>
                    <td className="max-w-[280px] truncate">{s.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}</td>
                    <td className="whitespace-nowrap">{paymentDescription(s.payment)}</td>
                    <td className="num font-semibold">{money(s.total)}</td>
                    <td className="num text-muted">{money(s.payment.net)}</td>
                    <td>{s.status === 'concluida' ? <Badge tone="ok">Concluída</Badge> : <Badge tone="danger">Cancelada</Badge>}</td>
                    <td className="whitespace-nowrap text-right">
                      <Button variant="ghost" size="sm" icon title="Detalhes" onClick={() => setDetail(s)}>
                        <Eye size={16} strokeWidth={1.75} />
                      </Button>
                      {s.status === 'concluida' && (
                        <Button variant="ghost" size="sm" icon title="Cancelar venda" onClick={() => setToCancel(s)} className="text-danger hover:text-danger-text">
                          <Ban size={16} strokeWidth={1.75} />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <SaleDetailsModal sale={detail} onClose={() => setDetail(null)} />
      <ConfirmDialog
        open={Boolean(toCancel)}
        onClose={() => setToCancel(null)}
        onConfirm={confirmCancel}
        title={toCancel ? `Cancelar venda #${toCancel.number}?` : ''}
        message="Os produtos voltam para o estoque e a venda deixa de contar no caixa e nos relatórios."
        confirmLabel="Cancelar venda"
        danger
      />
    </>
  )
}

import { useMemo, useState } from 'react'
import { Ban, Eye, FileDown, ShoppingBag } from 'lucide-react'
import type { PaymentMethod, Sale } from '@/types'
import { useStore } from '@/store/useStore'
import { sumNet, sumTotal } from '@/store/selectors'
import { addDays, isoInRange, todayStr } from '@/lib/dates'
import { formatDateTime, money, num } from '@/lib/format'
import { PAYMENT_LABELS, PAYMENT_METHODS, paymentDescription } from '@/lib/payments'
import { downloadCSV } from '@/lib/download'
import { Button } from '@/components/ui/Button'
import { Field, Select } from '@/components/ui/Field'
import { DateRange } from '@/components/ui/DateRange'
import { Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { SaleDetailsModal } from '@/components/SaleDetailsModal'
import { SALES_TABS } from './Sales'

export function SalesHistory() {
  const sales = useStore((s) => s.sales)
  const cancelSale = useStore((s) => s.cancelSale)
  const notify = useStore((s) => s.notify)

  const [from, setFrom] = useState(addDays(todayStr(), -6))
  const [to, setTo] = useState(todayStr())
  const [method, setMethod] = useState<'todas' | PaymentMethod>('todas')
  const [status, setStatus] = useState<'todas' | 'concluida' | 'cancelada'>('todas')
  const [detail, setDetail] = useState<Sale | null>(null)
  const [toCancel, setToCancel] = useState<Sale | null>(null)

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
      <PageHeader title="Vendas" />
      <Tabs items={SALES_TABS} />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <Field label="Período">
            <DateRange
              from={from}
              to={to}
              onChange={(f, t) => {
                setFrom(f)
                setTo(t)
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
        <Button onClick={exportCSV} disabled={list.length === 0}>
          <FileDown size={16} strokeWidth={1.5} /> Exportar CSV
        </Button>
      </div>

      <p className="mb-3 text-sm text-muted tabular">
        {num(completedList.length)} {completedList.length === 1 ? 'venda concluída' : 'vendas concluídas'} ·{' '}
        <span className="text-ink">{money(sumTotal(completedList))}</span> bruto · {money(sumNet(completedList))} líquido
      </p>

      <div className="table-wrap">
        {list.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Nenhuma venda no período"
            description="Ajuste o período ou os filtros para ver outras vendas."
          />
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
                  <td className="num font-medium">{money(s.total)}</td>
                  <td className="num text-muted">{money(s.payment.net)}</td>
                  <td>{s.status === 'concluida' ? <Badge tone="ok">Concluída</Badge> : <Badge tone="danger">Cancelada</Badge>}</td>
                  <td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="sm" icon title="Detalhes" onClick={() => setDetail(s)}>
                      <Eye size={16} strokeWidth={1.5} />
                    </Button>
                    {s.status === 'concluida' && (
                      <Button variant="ghost" size="sm" icon title="Cancelar venda" onClick={() => setToCancel(s)} className="text-danger hover:text-danger">
                        <Ban size={16} strokeWidth={1.5} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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

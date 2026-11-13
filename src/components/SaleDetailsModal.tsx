import type { Sale } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime, money, pct } from '@/lib/format'
import { PAYMENT_LABELS, installmentValue } from '@/lib/payments'

export function SaleDetailsModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  if (!sale) return null
  const p = sale.payment
  return (
    <Modal open onClose={onClose} title={`Venda #${sale.number}`} description={formatDateTime(sale.createdAt)} size="md">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">{PAYMENT_LABELS[p.method]}</span>
        {sale.status === 'cancelada' ? <Badge tone="danger">Cancelada</Badge> : <Badge tone="ok">Concluída</Badge>}
      </div>

      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Produto</th>
              <th className="num">Qtd</th>
              <th className="num">Unit.</th>
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((i) => (
              <tr key={i.productId}>
                <td>{i.name}</td>
                <td className="num">{i.quantity}</td>
                <td className="num">{money(i.unitPrice)}</td>
                <td className="num">{money(i.unitPrice * i.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dl className="mt-4 space-y-1.5 text-sm">
        <Row label="Total" value={money(sale.total)} strong />
        {p.nsu && <Row label="NSU" value={p.nsu} />}
        {p.method === 'credito_parcelado' && p.installments && (
          <Row label="Parcelas" value={`${p.installments}x de ${money(installmentValue(sale.total, p.installments))}`} />
        )}
        {p.method === 'dinheiro' && typeof p.received === 'number' && (
          <>
            <Row label="Recebido" value={money(p.received)} />
            <Row label="Troco" value={money(p.change ?? 0)} />
          </>
        )}
        <Row label={`Taxa (${pct(p.feePercent)})`} value={p.feeValue > 0 ? `− ${money(p.feeValue)}` : money(0)} />
        <Row label="Líquido" value={money(p.net)} />
        {sale.canceledAt && <Row label="Cancelada em" value={formatDateTime(sale.canceledAt)} />}
      </dl>
    </Modal>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={strong ? 'font-medium tabular' : 'tabular'}>{value}</dd>
    </div>
  )
}

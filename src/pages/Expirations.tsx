import { useMemo, useState } from 'react'
import { CalendarClock, Trash2 } from 'lucide-react'
import type { Lot, Product } from '@/types'
import { useStore } from '@/store/useStore'
import { daysUntil } from '@/lib/dates'
import { formatDate, money, num } from '@/lib/format'
import { lotStatus, type ExpiryStatus } from '@/lib/stock'
import { round2 } from '@/lib/payments'
import { Button } from '@/components/ui/Button'
import { Field, Input, NumberInput } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Chips } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Stat, StatGrid } from '@/components/ui/Stat'

interface Row {
  lot: Lot
  product: Product
  status: ExpiryStatus
  days: number
  value: number
}

function daysLabel(days: number): string {
  if (days < 0) return days === -1 ? 'Venceu ontem' : `Venceu há ${num(-days)} dias`
  if (days === 0) return 'Vence hoje'
  if (days === 1) return 'Vence amanhã'
  return `Vence em ${num(days)} dias`
}

export function Expirations() {
  const products = useStore((s) => s.products)
  const lots = useStore((s) => s.lots)
  const settings = useStore((s) => s.settings)
  const removeStock = useStore((s) => s.removeStock)
  const notify = useStore((s) => s.notify)

  const [filter, setFilter] = useState<'todos' | ExpiryStatus>('todos')
  const [discard, setDiscard] = useState<Row | null>(null)
  const [discardForm, setDiscardForm] = useState({ quantity: 0, note: 'Vencido' })

  const rows = useMemo<Row[]>(() => {
    return lots
      .filter((l) => l.quantity > 0)
      .map((lot) => {
        const product = products.find((p) => p.id === lot.productId)
        if (!product) return null
        return {
          lot,
          product,
          status: lotStatus(lot, settings.expiryWarningDays),
          days: daysUntil(lot.expiresAt),
          value: round2(lot.quantity * product.costPrice),
        }
      })
      .filter((r): r is Row => r !== null)
      .sort((a, b) => a.lot.expiresAt.localeCompare(b.lot.expiresAt) || a.product.name.localeCompare(b.product.name))
  }, [lots, products, settings.expiryWarningDays])

  const counts = {
    vencido: rows.filter((r) => r.status === 'vencido'),
    vencendo: rows.filter((r) => r.status === 'vencendo'),
    ok: rows.filter((r) => r.status === 'ok'),
  }
  const list = filter === 'todos' ? rows : rows.filter((r) => r.status === filter)
  const sumValue = (list: Row[]) => round2(list.reduce((a, r) => a + r.value, 0))

  function openDiscard(row: Row) {
    setDiscard(row)
    setDiscardForm({ quantity: row.lot.quantity, note: row.status === 'vencido' ? 'Vencido' : 'Descarte' })
  }

  function confirmDiscard() {
    if (!discard) return
    const quantity = Math.floor(discardForm.quantity)
    const r = removeStock({
      productId: discard.product.id,
      lotId: discard.lot.id,
      quantity,
      type: 'descarte',
      note: discardForm.note.trim() || undefined,
    })
    if (!r.ok) return notify(r.error, 'error')
    notify(`Baixa registrada: ${num(quantity)} un. de ${discard.product.name} · perda de ${money(quantity * discard.product.costPrice)}.`)
    setDiscard(null)
  }

  const discardValue = discard ? round2(Math.floor(discardForm.quantity) * discard.product.costPrice) : 0

  return (
    <>
      <PageHeader title="Vencimentos" description={`Lotes ordenados pela validade. Aviso para quem vence em até ${settings.expiryWarningDays} dias.`} />

      <StatGrid cols={3}>
        <Stat label="Vencidos" value={num(counts.vencido.length)} hint={`${money(sumValue(counts.vencido))} em custo`} />
        <Stat label={`Vencendo em até ${settings.expiryWarningDays} dias`} value={num(counts.vencendo.length)} hint={`${money(sumValue(counts.vencendo))} em custo`} />
        <Stat label="Dentro da validade" value={num(counts.ok.length)} hint={`${money(sumValue(counts.ok))} em custo`} />
      </StatGrid>

      <div className="mb-4 mt-6">
        <Chips
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'todos', label: 'Todos', count: rows.length },
            { value: 'vencido', label: 'Vencidos', count: counts.vencido.length },
            { value: 'vencendo', label: 'Vencendo', count: counts.vencendo.length },
            { value: 'ok', label: 'OK', count: counts.ok.length },
          ]}
        />
      </div>

      <div className="table-wrap">
        {list.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={rows.length === 0 ? 'Nenhum lote em estoque' : 'Nada por aqui'}
            description={
              rows.length === 0
                ? 'Registre entradas de estoque com data de validade para acompanhar os vencimentos.'
                : 'Nenhum lote com este status.'
            }
          />
        ) : (
          <table className="table hover">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Validade</th>
                <th>Prazo</th>
                <th className="num">Qtd</th>
                <th className="num">Valor em custo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.lot.id}>
                  <td>
                    <p className="font-medium">{r.product.name}</p>
                    <p className="text-xs text-faint">{r.product.category}</p>
                  </td>
                  <td className="tabular whitespace-nowrap">{formatDate(r.lot.expiresAt)}</td>
                  <td className="whitespace-nowrap text-muted">{daysLabel(r.days)}</td>
                  <td className="num">{num(r.lot.quantity)}</td>
                  <td className="num text-muted">{money(r.value)}</td>
                  <td>
                    {r.status === 'vencido' && <Badge tone="danger">Vencido</Badge>}
                    {r.status === 'vencendo' && <Badge tone="warn">Vencendo</Badge>}
                    {r.status === 'ok' && <Badge tone="ok">OK</Badge>}
                  </td>
                  <td className="whitespace-nowrap text-right">
                    <Button variant={r.status === 'vencido' ? 'danger' : 'secondary'} size="sm" onClick={() => openDiscard(r)}>
                      <Trash2 size={14} strokeWidth={1.5} /> Descartar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={Boolean(discard)}
        onClose={() => setDiscard(null)}
        title="Dar baixa por descarte"
        description={discard ? `${discard.product.name} · validade ${formatDate(discard.lot.expiresAt)}` : undefined}
        size="sm"
        footer={
          <>
            <Button onClick={() => setDiscard(null)}>Cancelar</Button>
            <Button variant="danger" onClick={confirmDiscard}>
              Confirmar descarte
            </Button>
          </>
        }
      >
        {discard && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              confirmDiscard()
            }}
          >
            <Field label="Quantidade" hint={`No lote: ${num(discard.lot.quantity)} un.`}>
              <NumberInput value={discardForm.quantity} onChange={(v) => setDiscardForm({ ...discardForm, quantity: v })} max={discard.lot.quantity} autoFocus />
            </Field>
            <Field label="Observação">
              <Input value={discardForm.note} onChange={(e) => setDiscardForm({ ...discardForm, note: e.target.value })} />
            </Field>
            <p className="text-sm text-muted">
              Valor perdido: <span className="font-medium text-danger tabular">{money(discardValue)}</span>
            </p>
          </form>
        )}
      </Modal>
    </>
  )
}

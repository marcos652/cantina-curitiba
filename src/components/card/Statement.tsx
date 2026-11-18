import { useMemo, useState } from 'react'
import { ShoppingBag, Wallet } from 'lucide-react'
import type { CardEntry } from '@/types'
import { customerBalance, monthKey, monthLabel } from '@/lib/card'
import { money } from '@/lib/format'
import { formatDateTime } from '@/lib/format'
import { round2 } from '@/lib/payments'
import { Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'

function Summary({ label, value, tone }: { label: string; value: string; tone?: 'danger' | 'ok' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular ${tone === 'danger' ? 'text-danger-text' : tone === 'ok' ? 'text-ok-text' : ''}`}>{value}</p>
    </div>
  )
}

/** Resumo da carteira + compras do mês escolhido. Usado pelo cliente e pelo administrador. */
export function CardStatement({ customerId, entries, limit, onRemoveEntry }: { customerId: string; entries: CardEntry[]; limit?: number; onRemoveEntry?: (e: CardEntry) => void }) {
  const mine = useMemo(() => entries.filter((e) => e.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [entries, customerId])
  const months = useMemo(() => {
    const set = new Set(mine.map((e) => monthKey(e.createdAt)))
    set.add(monthKey(new Date().toISOString()))
    return [...set].sort().reverse()
  }, [mine])
  const [month, setMonth] = useState(months[0])
  const total = customerBalance(mine, customerId)
  const inMonth = mine.filter((e) => monthKey(e.createdAt) === month)
  const monthBought = round2(inMonth.filter((e) => e.type === 'compra').reduce((a, e) => a + e.amount, 0))
  const monthPaid = round2(inMonth.filter((e) => e.type === 'pagamento').reduce((a, e) => a + e.amount, 0))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Summary label="Saldo devedor" value={money(total.owed)} tone={total.owed > 0 ? 'danger' : 'ok'} />
        <Summary label="Total pago" value={money(total.paid)} tone="ok" />
        <Summary label="Total consumido" value={money(total.consumed)} />
        <Summary label={limit && limit > 0 ? 'Saldo disponível' : 'Limite'} value={limit && limit > 0 ? money(Math.max(0, round2(limit - total.owed))) : 'Sem limite'} />
      </div>

      <section className="card">
        <div className="card-head">
          <p className="card-title">Compras do mês</p>
          <Select value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 w-auto">
            {months.map((m) => (
              <option key={m} value={m}>
                {monthLabel(m)}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3 border-b border-rule px-4 py-3 text-sm">
          <p>
            <span className="text-muted">Pego no mês </span>
            <span className="font-semibold tabular">{money(monthBought)}</span>
          </p>
          <p className="text-right">
            <span className="text-muted">Pago no mês </span>
            <span className="font-semibold text-ok-text tabular">{money(monthPaid)}</span>
          </p>
        </div>
        {inMonth.length === 0 ? (
          <EmptyState compact icon={ShoppingBag} title="Nada neste mês" description="As compras feitas com o cartão aparecem aqui." />
        ) : (
          <ul className="divide-y divide-rule">
            {inMonth.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${e.type === 'compra' ? 'bg-accent-soft text-accent' : 'bg-ok-soft text-ok-text'}`}>
                    {e.type === 'compra' ? <ShoppingBag size={15} strokeWidth={1.75} /> : <Wallet size={15} strokeWidth={1.75} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {e.type === 'compra' ? (e.items ?? []).map((i) => `${i.quantity}× ${i.name}`).join(', ') || 'Compra' : e.note ? `Pagamento · ${e.note}` : 'Pagamento'}
                    </p>
                    <p className="text-xs text-muted tabular">
                      {formatDateTime(e.createdAt)}
                      {e.saleNumber ? ` · Venda #${e.saleNumber}` : ''}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-sm font-bold tabular ${e.type === 'pagamento' ? 'text-ok-text' : ''}`}>
                    {e.type === 'pagamento' ? '− ' : ''}
                    {money(e.amount)}
                  </p>
                  {onRemoveEntry && e.type === 'pagamento' && (
                    <button type="button" onClick={() => onRemoveEntry(e)} className="text-xs text-faint hover:text-danger-text">
                      desfazer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

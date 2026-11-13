import { useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import type { MovementType } from '@/types'
import { useStore } from '@/store/useStore'
import { formatDate, formatDateTime, num } from '@/lib/format'
import { Field, Input, Select } from '@/components/ui/Field'
import { Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { STOCK_TABS } from './Stock'

const TYPE_LABELS: Record<MovementType, string> = {
  entrada: 'Entrada',
  venda: 'Venda',
  cancelamento: 'Cancelamento',
  perda: 'Perda',
  descarte: 'Descarte',
  ajuste: 'Ajuste',
}

const LIMIT = 300

export function Movements() {
  const movements = useStore((s) => s.movements)
  const [type, setType] = useState<'todos' | MovementType>('todos')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return movements
      .filter((m) => (type === 'todos' || m.type === type) && (!q || m.productName.toLowerCase().includes(q)))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }, [movements, type, query])

  return (
    <>
      <PageHeader title="Estoque" />
      <Tabs items={STOCK_TABS} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="relative sm:w-72">
          <Search size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
          <Input placeholder="Buscar produto" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Field className="sm:w-44">
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            <option value="todos">Todos os tipos</option>
            {(Object.keys(TYPE_LABELS) as MovementType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="table-wrap">
        {list.length === 0 ? (
          <EmptyState
            icon={History}
            title="Nenhuma movimentação"
            description="Entradas, vendas, perdas e descartes aparecem aqui conforme acontecem."
          />
        ) : (
          <table className="table hover">
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Tipo</th>
                <th className="num">Qtd</th>
                <th>Validade do lote</th>
                <th>Observação</th>
              </tr>
            </thead>
            <tbody>
              {list.slice(0, LIMIT).map((m) => (
                <tr key={m.id}>
                  <td className="tabular whitespace-nowrap text-muted">{formatDateTime(m.createdAt)}</td>
                  <td className="font-medium">{m.productName}</td>
                  <td>
                    <Badge tone={m.type === 'perda' || m.type === 'descarte' ? 'danger' : 'neutral'}>{TYPE_LABELS[m.type]}</Badge>
                  </td>
                  <td className="num">
                    {m.quantity > 0 ? '+' : '−'}
                    {num(Math.abs(m.quantity))}
                  </td>
                  <td className="tabular text-muted">{m.lotExpiresAt ? formatDate(m.lotExpiresAt) : '—'}</td>
                  <td className="max-w-[260px] truncate text-muted">{m.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {list.length > LIMIT && (
        <p className="mt-2 text-xs text-faint">Mostrando as {num(LIMIT)} movimentações mais recentes de {num(list.length)}.</p>
      )}
    </>
  )
}

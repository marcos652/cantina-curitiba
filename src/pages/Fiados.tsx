import { useMemo, useState } from 'react'
import { Check, HandCoins, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react'
import type { Fiado } from '@/types'
import { useStore } from '@/store/useStore'
import { daysUntil, todayStr } from '@/lib/dates'
import { formatDate, money, num } from '@/lib/format'
import { round2 } from '@/lib/payments'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Chips, Tabs } from '@/components/ui/Tabs'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { SALES_TABS } from './Sales'

type Filter = 'abertos' | 'pagos' | 'todos'

interface FormState {
  id?: string
  name: string
  takenAt: string
  dueAt: string
  amount: number
  note: string
}

const emptyForm = (): FormState => ({ name: '', takenAt: todayStr(), dueAt: '', amount: 0, note: '' })

function statusOf(f: Fiado): { tone: 'ok' | 'warn' | 'danger' | 'neutral'; label: string } {
  if (f.paid) return { tone: 'ok', label: f.paidAt ? `Pago em ${formatDate(f.paidAt)}` : 'Pago' }
  const d = daysUntil(f.dueAt)
  if (d < 0) return { tone: 'danger', label: `Atrasado ${Math.abs(d)} ${Math.abs(d) === 1 ? 'dia' : 'dias'}` }
  if (d === 0) return { tone: 'warn', label: 'Vence hoje' }
  return { tone: 'neutral', label: `Em ${d} ${d === 1 ? 'dia' : 'dias'}` }
}

export function Fiados() {
  const fiados = useStore((s) => s.fiados)
  const addFiado = useStore((s) => s.addFiado)
  const updateFiado = useStore((s) => s.updateFiado)
  const setFiadoPaid = useStore((s) => s.setFiadoPaid)
  const deleteFiado = useStore((s) => s.deleteFiado)
  const notify = useStore((s) => s.notify)

  const [filter, setFilter] = useState<Filter>('abertos')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState | null>(null)
  const [toDelete, setToDelete] = useState<Fiado | null>(null)

  const open = useMemo(() => fiados.filter((f) => !f.paid), [fiados])
  const openTotal = round2(open.reduce((a, f) => a + f.amount, 0))
  const overdue = open.filter((f) => daysUntil(f.dueAt) < 0)
  const overdueTotal = round2(overdue.reduce((a, f) => a + f.amount, 0))

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return fiados
      .filter((f) => (filter === 'todos' || (filter === 'pagos' ? f.paid : !f.paid)) && (!q || f.name.toLowerCase().includes(q)))
      .sort((a, b) => Number(a.paid) - Number(b.paid) || a.dueAt.localeCompare(b.dueAt) || a.name.localeCompare(b.name))
  }, [fiados, filter, query])

  function save() {
    if (!form) return
    const input = { name: form.name, takenAt: form.takenAt, dueAt: form.dueAt, amount: form.amount, note: form.note }
    const r = form.id ? updateFiado(form.id, input) : addFiado(input)
    if (!r.ok) return notify(r.error, 'error')
    notify(form.id ? 'Registro atualizado.' : 'Registro adicionado.')
    setForm(null)
  }

  return (
    <>
      <PageHeader title="Vendas" />
      <Tabs items={SALES_TABS} />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-[13px] text-muted">A receber</p>
          <p className="mt-1 text-xl font-bold tabular">{money(openTotal)}</p>
          <p className="text-xs text-faint">{num(open.length)} em aberto</p>
        </div>
        <div className="card p-4">
          <p className="text-[13px] text-muted">Atrasados</p>
          <p className={`mt-1 text-xl font-bold tabular ${overdue.length > 0 ? 'text-danger-text' : ''}`}>{money(overdueTotal)}</p>
          <p className="text-xs text-faint">{num(overdue.length)} {overdue.length === 1 ? 'registro' : 'registros'}</p>
        </div>
        <div className="card flex items-center justify-center p-4">
          <Button variant="primary" onClick={() => setForm(emptyForm())}>
            <Plus size={16} strokeWidth={2} /> Novo registro
          </Button>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <p className="card-title flex items-center gap-2">
            Funcionários <span className="count-pill">{num(list.length)}</span>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Chips
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'abertos', label: 'Em aberto' },
                { value: 'pagos', label: 'Pagos' },
                { value: 'todos', label: 'Todos' },
              ]}
            />
            <div className="relative w-full sm:w-56">
              <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <Input placeholder="Buscar nome" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-9" />
            </div>
          </div>
        </div>
        <div className="table-wrap">
          {list.length === 0 ? (
            <EmptyState
              icon={HandCoins}
              title={fiados.length === 0 ? 'Nenhum registro ainda' : 'Nada encontrado'}
              description={fiados.length === 0 ? 'Anote aqui quem pegou um produto e vai pagar depois.' : 'Tente outro filtro ou nome.'}
            />
          ) : (
            <table className="table hover">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Data que pegou</th>
                  <th>Data do pagamento</th>
                  <th className="num">Valor</th>
                  <th>Situação</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((f) => {
                  const st = statusOf(f)
                  return (
                    <tr key={f.id}>
                      <td>
                        <p className="font-medium">{f.name}</p>
                        {f.note && <p className="max-w-[220px] truncate text-xs text-muted">{f.note}</p>}
                      </td>
                      <td className="tabular whitespace-nowrap text-muted">{formatDate(f.takenAt)}</td>
                      <td className="tabular whitespace-nowrap text-muted">{formatDate(f.dueAt)}</td>
                      <td className="num font-semibold">{money(f.amount)}</td>
                      <td>
                        <Badge tone={st.tone}>{st.label}</Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {f.paid ? (
                            <Button variant="ghost" size="sm" icon aria-label="Reabrir" title="Marcar como não pago" onClick={() => setFiadoPaid(f.id, false)}>
                              <RotateCcw size={15} strokeWidth={1.75} />
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" icon aria-label="Marcar como pago" title="Marcar como pago" onClick={() => setFiadoPaid(f.id, true)}>
                              <Check size={16} strokeWidth={2} className="text-ok-text" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            icon
                            aria-label="Editar"
                            title="Editar"
                            onClick={() => setForm({ id: f.id, name: f.name, takenAt: f.takenAt, dueAt: f.dueAt, amount: f.amount, note: f.note ?? '' })}
                          >
                            <Pencil size={15} strokeWidth={1.75} />
                          </Button>
                          <Button variant="ghost" size="sm" icon aria-label="Excluir" title="Excluir" onClick={() => setToDelete(f)}>
                            <Trash2 size={15} strokeWidth={1.75} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?.id ? 'Editar registro' : 'Novo registro'}
        description="Funcionário que pegou algum produto e vai pagar depois."
        footer={
          <>
            <Button onClick={() => setForm(null)}>Cancelar</Button>
            <Button variant="primary" onClick={save}>
              Salvar
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-3 pb-2">
            <Field label="Nome do funcionário">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus maxLength={80} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data que pegou">
                <Input type="date" value={form.takenAt} onChange={(e) => setForm({ ...form, takenAt: e.target.value })} />
              </Field>
              <Field label="Data que vai pagar">
                <Input type="date" value={form.dueAt} min={form.takenAt || undefined} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} />
              </Field>
            </div>
            <Field label="Valor">
              <MoneyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
            </Field>
            <Field label="Observação (opcional)" hint="Ex.: o que pegou.">
              <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={120} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={() => toDelete && deleteFiado(toDelete.id)}
        title="Excluir registro?"
        message={toDelete ? `${toDelete.name} · ${money(toDelete.amount)}. Esta ação não pode ser desfeita.` : undefined}
        confirmLabel="Excluir"
        danger
      />
    </>
  )
}

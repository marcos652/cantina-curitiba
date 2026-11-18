import { useMemo, useState } from 'react'
import { Ban, CheckCircle2, IdCard, Trash2, UserPlus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useSession } from '@/store/session'
import { createCustomer, createMessage, removeCustomerAccess } from '@/store/users'
import { customerBalance } from '@/lib/card'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'
import { CreditCard } from '@/components/card/CreditCard'
import { CardStatement } from '@/components/card/Statement'

export function Customers() {
  const role = useSession((s) => s.role)
  const customers = useStore((s) => s.customers)
  const entries = useStore((s) => s.cardEntries)
  const storeName = useStore((s) => s.settings.storeName)
  const logo = useStore((s) => s.settings.logo)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const addCardPayment = useStore((s) => s.addCardPayment)
  const removeCardEntry = useStore((s) => s.removeCardEntry)
  const notify = useStore((s) => s.notify)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [limit, setLimit] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [payAmount, setPayAmount] = useState(0)
  const [payNote, setPayNote] = useState('')
  const [toRemove, setToRemove] = useState<string | null>(null)

  const isOwner = role === 'dono'
  const rows = useMemo(
    () => customers.map((c) => ({ c, b: customerBalance(entries, c.id) })).sort((a, b) => a.c.name.localeCompare(b.c.name)),
    [customers, entries],
  )
  const totals = rows.reduce((a, r) => ({ owed: a.owed + r.b.owed, paid: a.paid + r.b.paid }), { owed: 0, paid: 0 })
  const selected = customers.find((c) => c.id === (selectedId ?? rows[0]?.c.id))
  const balance = selected ? customerBalance(entries, selected.id) : null

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (senha.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    setBusy(true)
    try {
      await createCustomer({ nome, email, senha, limit })
      notify(`Cartão criado para ${nome.trim()}.`)
      setNome('')
      setEmail('')
      setSenha('')
      setLimit(0)
    } catch (err) {
      setError(createMessage(err))
    } finally {
      setBusy(false)
    }
  }

  function pay() {
    if (!selected) return
    const r = addCardPayment(selected.id, payAmount, payNote)
    if (!r.ok) return notify(r.error, 'error')
    notify(`Pagamento de ${money(payAmount)} registrado.`)
    setPayAmount(0)
    setPayNote('')
  }

  async function remove() {
    if (!toRemove) return
    try {
      await removeCustomerAccess(toRemove)
      if (selectedId === toRemove) setSelectedId(null)
      notify('Cliente removido.')
    } catch (err) {
      notify(createMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Clientes e cartões" description="Cada cliente tem um cartão fidelidade: o que ele pega vira dívida e é pago no fechamento do mês." />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-muted">Clientes</p><p className="mt-1 text-xl font-bold tabular">{customers.length}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Total a receber</p><p className="mt-1 text-xl font-bold text-danger-text tabular">{money(totals.owed)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Total já pago</p><p className="mt-1 text-xl font-bold text-ok-text tabular">{money(totals.paid)}</p></div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          {isOwner && (
            <form onSubmit={add} className="card h-fit space-y-4 p-4">
              <p className="text-sm font-semibold">Novo cliente</p>
              <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João Silva" required /></Field>
              <Field label="E-mail (login do cliente)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
              <Field label="Senha provisória" hint="Mínimo de 6 caracteres. Passe ao cliente, que entra pela tela Entrar e vê só o cartão dele.">
                <Input type="text" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </Field>
              <Field label="Limite de dívida" hint="Zero = sem limite.">
                <MoneyInput value={limit} onChange={setLimit} />
              </Field>
              {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
              <Button type="submit" variant="primary" full disabled={busy || !nome.trim() || !email || !senha}>
                <UserPlus size={16} strokeWidth={1.75} /> {busy ? 'Criando...' : 'Criar cliente e cartão'}
              </Button>
            </form>
          )}

          <section className="card">
            <div className="card-head"><p className="card-title">Clientes <span className="count-pill">{customers.length}</span></p></div>
            {rows.length === 0 ? (
              <EmptyState compact icon={IdCard} title="Nenhum cliente ainda" description={isOwner ? 'Crie o primeiro cliente ao lado.' : 'O dono cria os clientes.'} />
            ) : (
              <ul className="divide-y divide-rule">
                {rows.map(({ c, b }) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => setSelectedId(c.id)} className={cx('flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-raised', selected?.id === c.id && 'bg-accent-soft/50')}>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.name} {!c.active && <Badge tone="danger">Bloqueado</Badge>}</span>
                        <span className="block truncate text-xs text-muted">{c.email}</span>
                      </span>
                      <span className={cx('shrink-0 text-sm font-bold tabular', b.owed > 0 ? 'text-danger-text' : 'text-ok-text')}>{money(b.owed)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {selected && balance && (
          <div className="min-w-0 space-y-4">
            <div className="card flex flex-col items-center gap-4 p-4 sm:flex-row sm:items-start">
              <CreditCard name={selected.name} number={selected.cardNumber} storeName={storeName} logo={logo} active={selected.active} className="shrink-0" />
              <div className="w-full min-w-0 flex-1 space-y-3">
                <div>
                  <p className="text-xs text-muted">Saldo devedor</p>
                  <p className={cx('text-2xl font-bold tabular', balance.owed > 0 ? 'text-danger-text' : 'text-ok-text')}>{money(balance.owed)}</p>
                </div>
                <div className="flex items-end gap-2">
                  <Field label="Registrar pagamento" className="flex-1"><MoneyInput value={payAmount} onChange={setPayAmount} /></Field>
                  <Button variant="primary" disabled={payAmount <= 0 || balance.owed <= 0} onClick={pay}>Receber</Button>
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setPayAmount(balance.owed)} className="h-7 rounded border border-control bg-white px-2 text-xs text-muted hover:text-ink">Quitar tudo ({money(balance.owed)})</button>
                </div>
                <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Observação (ex.: Pix, dinheiro, fechamento de outubro)" className="h-8" />
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={() => updateCustomer(selected.id, { active: !selected.active })}>
                    {selected.active ? <><Ban size={14} strokeWidth={1.75} /> Bloquear cartão</> : <><CheckCircle2 size={14} strokeWidth={1.75} /> Desbloquear</>}
                  </Button>
                  {isOwner && (
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setToRemove(selected.id)}>
                      <Trash2 size={14} strokeWidth={1.75} /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
            <CardStatement customerId={selected.id} entries={entries} limit={selected.limit} onRemoveEntry={(e) => removeCardEntry(e.id)} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={remove}
        title="Remover este cliente?"
        message="O cartão e todo o histórico de lançamentos dele serão apagados e o login deixa de dar acesso. As vendas continuam no histórico."
        confirmLabel="Remover cliente"
        danger
      />
    </>
  )
}

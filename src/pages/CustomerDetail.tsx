import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Ban, CheckCircle2, IdCard, Trash2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useSession } from '@/store/session'
import { createMessage, removeCustomerAccess } from '@/store/users'
import { customerBalance } from '@/lib/card'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/Modal'
import { FlipCard } from '@/components/card/FlipCard'
import { CardStatement } from '@/components/card/Statement'

/** Cartão de um cliente: cartão em destaque, pagamento e compras do mês. Usado no modal da lista e na página. */
export function CustomerPanel({ id, onRemoved }: { id: string; onRemoved: () => void }) {
  const role = useSession((s) => s.role)
  const customers = useStore((s) => s.customers)
  const entries = useStore((s) => s.cardEntries)
  const storeName = useStore((s) => s.settings.storeName)
  const logo = useStore((s) => s.settings.logo)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const addCardPayment = useStore((s) => s.addCardPayment)
  const removeCardEntry = useStore((s) => s.removeCardEntry)
  const notify = useStore((s) => s.notify)

  const [payAmount, setPayAmount] = useState(0)
  const [payNote, setPayNote] = useState('')
  const [confirmRemove, setConfirmRemove] = useState(false)

  const isOwner = role === 'dono'
  const selected = customers.find((c) => c.id === id)

  if (!selected) {
    return (
      <div className="card">
        <EmptyState icon={IdCard} title="Este cartão não existe mais" description="Volte à lista de clientes." />
      </div>
    )
  }

  const balance = customerBalance(entries, selected.id)

  function pay() {
    const r = addCardPayment(selected!.id, payAmount, payNote)
    if (!r.ok) return notify(r.error, 'error')
    notify(`Pagamento de ${money(payAmount)} registrado.`)
    setPayAmount(0)
    setPayNote('')
  }

  async function remove() {
    try {
      await removeCustomerAccess(selected!.id)
      notify('Cartão excluído.')
      onRemoved()
    } catch (err) {
      notify(createMessage(err), 'error')
    }
  }

  return (
    <>
      <div className="min-w-0 space-y-4">
            <section className="flex flex-col items-center py-4">
              <FlipCard name={selected.name} number={selected.cardNumber} storeName={storeName} logo={logo} active={selected.active} balance={balance} limit={selected.limit} />
              <p className="mt-3 text-xs text-muted">Deslize o cartão para o lado para virar</p>
            </section>
            <div className="card space-y-3 p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">Saldo devedor</p>
                  <p className={cx('text-2xl font-bold tabular', balance.owed > 0 ? 'text-danger-text' : 'text-ok-text')}>{money(balance.owed)}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateCustomer(selected.id, { active: !selected.active })}>
                    {selected.active ? <><Ban size={14} strokeWidth={1.75} /> Bloquear cartão</> : <><CheckCircle2 size={14} strokeWidth={1.75} /> Desbloquear</>}
                  </Button>
                  {isOwner && (
                    <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirmRemove(true)}>
                      <Trash2 size={14} strokeWidth={1.75} /> Excluir cartão
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Field label="Registrar pagamento" className="flex-1"><MoneyInput value={payAmount} onChange={setPayAmount} /></Field>
                <Button variant="primary" disabled={payAmount <= 0 || balance.owed <= 0} onClick={pay}>Receber</Button>
              </div>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setPayAmount(balance.owed)} className="h-7 rounded border border-control bg-white px-2 text-xs text-muted hover:text-ink">Quitar tudo ({money(balance.owed)})</button>
              </div>
              <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Observação (ex.: Pix, dinheiro, fechamento de outubro)" className="h-8" />
            </div>
            <CardStatement customerId={selected.id} entries={entries} limit={selected.limit} onRemoveEntry={(e) => removeCardEntry(e.id)} />
          </div>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={remove}
        title={`Excluir o cartão de ${selected.name}?`}
        message={`${balance.owed > 0 ? `ATENÇÃO: este cliente ainda deve ${money(balance.owed)}. ` : ''}O cartão e todo o histórico de lançamentos dele serão apagados e o login deixa de dar acesso. As vendas continuam no histórico. Não dá para desfazer.`}
        confirmLabel="Excluir cartão"
        danger
      />
    </>
  )
}

/** Página completa do cartão (endereço /clientes/:id). */
export function CustomerDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const customer = useStore((s) => s.customers.find((c) => c.id === id))
  return (
    <>
      <PageHeader title={customer?.name ?? 'Cliente não encontrado'} description={customer?.email} crumbs={[{ label: 'Clientes e cartões', to: '/clientes' }]} />
      <div className="mx-auto max-w-3xl">
        <CustomerPanel id={id} onRemoved={() => navigate('/clientes')} />
      </div>
    </>
  )
}

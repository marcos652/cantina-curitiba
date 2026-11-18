import { useMemo, useRef, useState } from 'react'
import { ChevronRight, ScanBarcode, IdCard, Search, UserPlus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useSession } from '@/store/session'
import { createCustomer, createMessage } from '@/store/users'
import { customerBalance, findByCardNumber } from '@/lib/card'
import { uniqueById } from '@/lib/unique'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Tabs } from '@/components/ui/Tabs'
import { CameraScanButton } from '@/components/card/CameraScanner'
import { SALES_TABS } from './Sales'
import { CustomerPanel } from './CustomerDetail'

/** Lista de clientes: clicar abre a página do cartão da pessoa. */
export function Customers() {
  const role = useSession((s) => s.role)
  const customers = useStore((s) => s.customers)
  const entries = useStore((s) => s.cardEntries)
  const notify = useStore((s) => s.notify)
  const addCardCharge = useStore((s) => s.addCardCharge)
  const [chargeOpen, setChargeOpen] = useState(false)
  const [scan, setScan] = useState('')
  const [chargeId, setChargeId] = useState<string | null>(null)
  const [chargeValue, setChargeValue] = useState(0)
  const [chargeNote, setChargeNote] = useState('')
  const chargeCustomer = customers.find((c) => c.id === chargeId)
  const chargeOwed = chargeCustomer ? customerBalance(entries, chargeCustomer.id).owed : 0

  function closeCharge() {
    setChargeOpen(false)
    setScan('')
    setChargeId(null)
    setChargeValue(0)
    setChargeNote('')
  }
  function lookup(raw = scan) {
    const found = findByCardNumber(customers, raw)
    if (!found) return notify('Cartão não encontrado.', 'error')
    setChargeId(found.id)
    setScan('')
  }
  function charge() {
    if (!chargeCustomer) return
    const r = addCardCharge(chargeCustomer.id, chargeValue, chargeNote)
    if (!r.ok) return notify(r.error, 'error')
    notify(`${money(chargeValue)} lançado no cartão de ${chargeCustomer.name}.`)
    setChargeId(null)
    setChargeValue(0)
    setChargeNote('')
  }

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const openCustomer = customers.find((c) => c.id === openId)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [limit, setLimit] = useState(0)
  const [busy, setBusy] = useState(false)
  const submitting = useRef(false)
  const [error, setError] = useState('')

  const isOwner = role === 'dono'
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return uniqueById(customers)
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.cardNumber.replace(/\D/g, '').includes(q.replace(/\D/g, '') || '\u0000'))
      .map((c) => ({ c, b: customerBalance(entries, c.id) }))
      .sort((a, b) => a.c.name.localeCompare(b.c.name))
  }, [customers, entries, query])
  const totals = customers.reduce(
    (a, c) => {
      const b = customerBalance(entries, c.id)
      return { owed: a.owed + b.owed, paid: a.paid + b.paid }
    },
    { owed: 0, paid: 0 },
  )

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (submitting.current) return
    setError('')
    if (senha.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    submitting.current = true
    setBusy(true)
    try {
      await createCustomer({ nome, email, senha, limit })
      notify(`Cartão criado para ${nome.trim()}.`)
      setNome('')
      setEmail('')
      setSenha('')
      setLimit(0)
      setOpen(false)
    } catch (err) {
      setError(createMessage(err))
    } finally {
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <>
      <Tabs items={SALES_TABS} />
      <PageHeader title="Clientes e cartões" description="Cada cliente tem um cartão fidelidade: o que ele pega vira dívida e é pago no fechamento do mês.">
        <Button variant="primary" onClick={() => setChargeOpen(true)}>
          <ScanBarcode size={16} strokeWidth={1.75} /> Bipar cartão
        </Button>
        {isOwner && (
          <Button onClick={() => setOpen(true)}>
            <UserPlus size={16} strokeWidth={1.75} /> Novo cliente
          </Button>
        )}
      </PageHeader>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="card p-4"><p className="text-xs text-muted">Clientes</p><p className="mt-1 text-xl font-bold tabular">{customers.length}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Total a receber</p><p className="mt-1 text-xl font-bold text-danger-text tabular">{money(totals.owed)}</p></div>
        <div className="card p-4"><p className="text-xs text-muted">Total já pago</p><p className="mt-1 text-xl font-bold text-ok-text tabular">{money(totals.paid)}</p></div>
      </div>

      <section className="card">
        <div className="card-head">
          <p className="card-title flex items-center gap-2">Pessoas <span className="count-pill">{rows.length}</span></p>
          <div className="relative w-full sm:w-64">
            <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input
              placeholder="Buscar por nome, e-mail ou número do cartão"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                const found = findByCardNumber(customers, query)
                if (found) {
                  setOpenId(found.id)
                  setQuery('')
                }
              }}
              className="h-8 pl-9"
            />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState compact icon={IdCard} title={customers.length === 0 ? 'Nenhum cliente ainda' : 'Ninguém encontrado'} description={customers.length === 0 ? (isOwner ? 'Clique em Novo cliente para criar o primeiro cartão.' : 'O dono cria os clientes.') : 'Tente outro nome.'} />
        ) : (
          <ul className="divide-y divide-rule">
            {rows.map(({ c, b }) => (
              <li key={c.id}>
                <button type="button" onClick={() => setOpenId(c.id)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-raised">
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 truncate text-sm font-medium">
                      {c.name} {!c.active && <Badge tone="danger">Bloqueado</Badge>}
                    </span>
                    <span className="block truncate text-xs text-muted">{c.email}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-right">
                      <span className="block text-[11px] text-muted">Deve</span>
                      <span className={cx('text-sm font-bold tabular', b.owed > 0 ? 'text-danger-text' : 'text-ok-text')}>{money(b.owed)}</span>
                    </span>
                    <ChevronRight size={16} strokeWidth={1.75} className="text-faint" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal open={Boolean(openCustomer)} onClose={() => setOpenId(null)} title={openCustomer?.name ?? ''} description={openCustomer?.email} size="lg">
        {openId && (
          <div className="pb-3">
            <CustomerPanel id={openId} onRemoved={() => setOpenId(null)} />
          </div>
        )}
      </Modal>

      <Modal open={chargeOpen} onClose={closeCharge} title="Cobrar no cartão" description="Bipe o cartão do cliente e digite o valor.">
        <div className="space-y-4 pb-3">
          {!chargeCustomer && <CameraScanButton onCode={(c) => lookup(c)} label="Ler QR Code com a câmera" />}
          {!chargeCustomer ? (
            <Field label="Bipe o cartão" hint="Passe o leitor no código de barras (ou digite o número) e tecle Enter.">
              <Input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    lookup()
                  }
                }}
                inputMode="numeric"
                placeholder="Número do cartão"
                autoFocus
              />
            </Field>
          ) : (
            <>
              <div className="rounded-md bg-raised p-3">
                <p className="text-sm font-semibold">{chargeCustomer.name}</p>
                <p className="text-xs text-muted">{chargeCustomer.email}</p>
                <p className="mt-2 text-sm tabular">
                  Em aberto <span className="font-semibold">{money(chargeOwed)}</span>
                  {chargeCustomer.limit > 0 && <span className="text-muted"> · limite {money(chargeCustomer.limit)}</span>}
                </p>
                {!chargeCustomer.active && <p className="mt-1 text-sm font-medium text-danger-text">Cartão bloqueado</p>}
              </div>
              <Field label="Valor">
                <MoneyInput value={chargeValue} onChange={setChargeValue} autoFocus />
              </Field>
              <Field label="Descrição (opcional)">
                <Input value={chargeNote} onChange={(e) => setChargeNote(e.target.value)} placeholder="Ex.: 2 salgados e 1 refri" />
              </Field>
              <div className="flex gap-2">
                <Button onClick={() => setChargeId(null)}>Trocar cartão</Button>
                <Button variant="primary" full disabled={chargeValue <= 0 || !chargeCustomer.active} onClick={charge}>
                  Lançar {chargeValue > 0 ? money(chargeValue) : ''} no cartão
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Novo cliente" description="Cria o login do cliente e o cartão dele.">
        <form onSubmit={add} className="space-y-4">
          <Field label="Nome"><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: João Silva" required autoFocus /></Field>
          <Field label="E-mail (login do cliente)"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Senha provisória" hint="Mínimo de 6 caracteres. Passe ao cliente, que entra pela tela Entrar e vê só o cartão dele.">
            <Input type="text" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Field>
          <Field label="Limite de dívida" hint="Zero = sem limite."><MoneyInput value={limit} onChange={setLimit} /></Field>
          {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
          <Button type="submit" variant="primary" full disabled={busy || !nome.trim() || !email || !senha}>
            <UserPlus size={16} strokeWidth={1.75} /> {busy ? 'Criando...' : 'Criar cliente e cartão'}
          </Button>
        </form>
      </Modal>
    </>
  )
}

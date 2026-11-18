import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, IdCard, Search, UserPlus } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useSession } from '@/store/session'
import { createCustomer, createMessage } from '@/store/users'
import { customerBalance } from '@/lib/card'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input, MoneyInput } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

/** Lista de clientes: clicar abre a página do cartão da pessoa. */
export function Customers() {
  const role = useSession((s) => s.role)
  const customers = useStore((s) => s.customers)
  const entries = useStore((s) => s.cardEntries)
  const notify = useStore((s) => s.notify)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [limit, setLimit] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isOwner = role === 'dono'
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
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
    if (busy) return
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
      setOpen(false)
    } catch (err) {
      setError(createMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Clientes e cartões" description="Cada cliente tem um cartão fidelidade: o que ele pega vira dívida e é pago no fechamento do mês.">
        {isOwner && (
          <Button variant="primary" onClick={() => setOpen(true)}>
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
            <Input placeholder="Buscar por nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-9" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState compact icon={IdCard} title={customers.length === 0 ? 'Nenhum cliente ainda' : 'Ninguém encontrado'} description={customers.length === 0 ? (isOwner ? 'Clique em Novo cliente para criar o primeiro cartão.' : 'O dono cria os clientes.') : 'Tente outro nome.'} />
        ) : (
          <ul className="divide-y divide-rule">
            {rows.map(({ c, b }) => (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-raised">
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
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

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

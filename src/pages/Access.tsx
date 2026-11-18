import { useEffect, useMemo, useState } from 'react'
import { Ban, CheckCircle2, Download, Eye, KeyRound, Search, ShieldCheck, ShieldAlert, UsersRound } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useSession } from '@/store/session'
import { useContracts, startContracts, stopContracts } from '@/store/contracts'
import { sendReset } from '@/store/boot'
import { customerBalance } from '@/lib/card'
import { downloadContract, viewContract } from '@/lib/lgpdPdf'
import { verifyContract } from '@/lib/lgpd'
import { formatDateTime, money } from '@/lib/format'
import { cx } from '@/lib/cx'
import type { LgpdContract } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { ConfirmDialog } from '@/components/ui/Modal'

const TABS = [
  { to: '/acessos', label: 'Acessos dos clientes', end: true },
  { to: '/acessos/contratos', label: 'Contratos LGPD' },
]

function Kpi({ label, value, tone }: { label: string; value: string | number; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className={cx('mt-1 text-xl font-bold tabular', tone === 'ok' && 'text-ok-text', tone === 'warn' && 'text-warn-text', tone === 'danger' && 'text-danger-text')}>{value}</p>
    </div>
  )
}

/** Carrega os termos assinados enquanto a página está aberta. */
function useLoadContracts() {
  const items = useContracts((s) => s.items)
  const loaded = useContracts((s) => s.loaded)
  const error = useContracts((s) => s.error)
  useEffect(() => {
    void startContracts()
    return stopContracts
  }, [])
  return { items, loaded, error }
}

function PermissionNotice({ error }: { error: string }) {
  if (!error) return null
  return (
    <div className="notice mb-4">
      {error === 'permission'
        ? 'Não foi possível ler os contratos: publique as regras novas do Firestore (arquivo firestore.rules, bloco lgpdContratos).'
        : 'Não foi possível carregar os contratos agora. Tente de novo em instantes.'}
    </div>
  )
}

export function Access() {
  const role = useSession((s) => s.role)
  const customers = useStore((s) => s.customers)
  const entries = useStore((s) => s.cardEntries)
  const updateCustomer = useStore((s) => s.updateCustomer)
  const notify = useStore((s) => s.notify)
  const { items, loaded, error } = useLoadContracts()
  const [query, setQuery] = useState('')
  const [toBlock, setToBlock] = useState<string | null>(null)

  const byId = useMemo(() => new Map(items.map((c) => [c.customerId, c])), [items])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return customers
      .filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .map((c) => ({ c, contract: byId.get(c.id), owed: customerBalance(entries, c.id).owed }))
      .sort((a, b) => a.c.name.localeCompare(b.c.name))
  }, [customers, entries, byId, query])

  const active = customers.filter((c) => c.active).length
  const signed = customers.filter((c) => byId.has(c.id)).length
  const blocking = customers.find((c) => c.id === toBlock)

  async function reset(email: string) {
    try {
      await sendReset(email)
      notify(`Link para criar nova senha enviado para ${email}.`)
    } catch {
      notify('Não foi possível enviar o e-mail agora.', 'error')
    }
  }

  if (role !== 'dono') {
    return (
      <>
        <PageHeader title="Acessos e LGPD" />
        <div className="card">
          <EmptyState icon={UsersRound} title="Só o dono da cantina gerencia os acessos" description="Peça ao dono para fazer essa gestão." />
        </div>
      </>
    )
  }

  return (
    <>
      <PageHeader title="Acessos e LGPD" description="Quem tem acesso ao app como cliente e quem já assinou o termo de privacidade." />
      <Tabs items={TABS} />
      <PermissionNotice error={error} />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Clientes" value={customers.length} />
        <Kpi label="Com acesso ativo" value={active} tone="ok" />
        <Kpi label="Termo assinado" value={loaded ? signed : '—'} tone="ok" />
        <Kpi label="Aguardando assinatura" value={loaded ? customers.length - signed : '—'} tone={customers.length - signed > 0 ? 'warn' : 'ok'} />
      </div>

      <section className="card">
        <div className="card-head">
          <p className="card-title flex items-center gap-2">Clientes <span className="count-pill">{rows.length}</span></p>
          <div className="relative w-full sm:w-64">
            <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input placeholder="Buscar por nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-9" />
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState compact icon={UsersRound} title={customers.length === 0 ? 'Nenhum cliente ainda' : 'Ninguém encontrado'} description={customers.length === 0 ? 'Crie os clientes em Vendas, Clientes e cartões.' : 'Tente outro nome.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Acesso</th>
                  <th>Termo LGPD</th>
                  <th className="num">Em aberto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ c, contract, owed }) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted">{c.email}</p>
                    </td>
                    <td>{c.active ? <Badge tone="ok">Ativo</Badge> : <Badge tone="danger">Bloqueado</Badge>}</td>
                    <td>
                      {!loaded ? (
                        <span className="text-xs text-muted">...</span>
                      ) : contract ? (
                        <span className="flex items-center gap-1.5 text-[13px] text-ok-text">
                          <ShieldCheck size={15} strokeWidth={1.75} /> Assinado em {formatDateTime(contract.signedAt)}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-[13px] text-warn-text">
                          <ShieldAlert size={15} strokeWidth={1.75} /> Pendente
                        </span>
                      )}
                    </td>
                    <td className={cx('num', owed > 0 && 'text-danger-text')}>{money(owed)}</td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        {contract && (
                          <Button size="sm" variant="ghost" icon title="Baixar o termo assinado (PDF)" onClick={() => void downloadContract(contract)}>
                            <Download size={16} strokeWidth={1.75} />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" icon title="Enviar link para criar nova senha" onClick={() => void reset(c.email)}>
                          <KeyRound size={16} strokeWidth={1.75} />
                        </Button>
                        {c.active ? (
                          <Button size="sm" onClick={() => setToBlock(c.id)}>
                            <Ban size={14} strokeWidth={1.75} /> Bloquear
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => updateCustomer(c.id, { active: true })}>
                            <CheckCircle2 size={14} strokeWidth={1.75} /> Liberar
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(blocking)}
        onClose={() => setToBlock(null)}
        onConfirm={() => {
          if (blocking) updateCustomer(blocking.id, { active: false })
          notify('Acesso bloqueado.')
        }}
        title={blocking ? `Bloquear o acesso de ${blocking.name}?` : ''}
        message="A pessoa não consegue mais ver o cartão nem comprar com ele até você liberar de novo. O histórico e o termo assinado continuam guardados."
        confirmLabel="Bloquear acesso"
        danger
      />
    </>
  )
}

export function Contracts() {
  const role = useSession((s) => s.role)
  const customers = useStore((s) => s.customers)
  const { items, loaded, error } = useLoadContracts()
  const [query, setQuery] = useState('')
  const [valid, setValid] = useState<Record<string, boolean>>({})

  const pending = customers.filter((c) => loaded && !items.some((i) => i.customerId === c.id))
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return items.filter((c) => !q || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.signedName.toLowerCase().includes(q))
  }, [items, query])

  useEffect(() => {
    let alive = true
    void Promise.all(items.map(async (c) => [c.id, await verifyContract(c)] as const)).then((r) => alive && setValid(Object.fromEntries(r)))
    return () => {
      alive = false
    }
  }, [items])

  if (role !== 'dono') {
    return (
      <>
        <PageHeader title="Contratos LGPD" />
        <div className="card">
          <EmptyState icon={ShieldCheck} title="Só o dono da cantina vê os contratos" description="Peça ao dono para consultar." />
        </div>
      </>
    )
  }

  const open = (c: LgpdContract) => void viewContract(c)

  return (
    <>
      <PageHeader title="Acessos e LGPD" description="Termos de privacidade assinados pelos clientes, com o arquivo de cada um." />
      <Tabs items={TABS} />
      <PermissionNotice error={error} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Kpi label="Contratos assinados" value={loaded ? items.length : '—'} tone="ok" />
        <Kpi label="Clientes sem assinar" value={loaded ? pending.length : '—'} tone={pending.length > 0 ? 'warn' : 'ok'} />
      </div>

      <section className="card">
        <div className="card-head">
          <p className="card-title flex items-center gap-2">Contratos assinados <span className="count-pill">{rows.length}</span></p>
          <div className="relative w-full sm:w-64">
            <Search size={15} strokeWidth={1.75} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
            <Input placeholder="Buscar por nome ou e-mail" value={query} onChange={(e) => setQuery(e.target.value)} className="h-8 pl-9" />
          </div>
        </div>
        {!loaded ? (
          <p className="px-4 py-6 text-[13px] text-muted">Carregando...</p>
        ) : rows.length === 0 ? (
          <EmptyState compact icon={ShieldCheck} title={items.length === 0 ? 'Nenhum contrato assinado ainda' : 'Nada encontrado'} description={items.length === 0 ? 'Quando um cliente entrar pela primeira vez, ele assina o termo e ele aparece aqui.' : 'Tente outro nome.'} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Assinado em</th>
                  <th>Assinatura</th>
                  <th>Versão</th>
                  <th>Integridade</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-xs text-muted">{c.email}</p>
                    </td>
                    <td className="tabular text-muted">{formatDateTime(c.signedAt)}</td>
                    <td>{c.signedName}</td>
                    <td className="text-muted">{c.version}</td>
                    <td>
                      {valid[c.id] === undefined ? (
                        <span className="text-xs text-muted">...</span>
                      ) : valid[c.id] ? (
                        <Badge tone="ok">Íntegro</Badge>
                      ) : (
                        <Badge tone="danger">Alterado</Badge>
                      )}
                      <p className="mt-0.5 font-mono text-[10px] text-faint" title={c.hash}>{c.hash.slice(0, 12)}…</p>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" onClick={() => open(c)}>
                          <Eye size={14} strokeWidth={1.75} /> Ver
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => void downloadContract(c)}>
                          <Download size={14} strokeWidth={1.75} /> PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {pending.length > 0 && (
        <section className="card mt-4">
          <div className="card-head">
            <p className="card-title flex items-center gap-2">Aguardando assinatura <span className="count-pill">{pending.length}</span></p>
          </div>
          <ul className="divide-y divide-rule">
            {pending.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted">{c.email}</span>
                </span>
                <Badge tone="warn">Ainda não assinou</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}

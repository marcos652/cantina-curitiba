import { useCallback, useEffect, useState } from 'react'
import { Trash2, UserPlus, Users as UsersIcon } from 'lucide-react'
import { useSession } from '@/store/session'
import { createMember, createMessage, listMembers, removeMember, type Member } from '@/store/users'
import { useStore } from '@/store/useStore'
import { formatDate } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from '@/components/ui/Modal'

export function Users() {
  const role = useSession((s) => s.role)
  const notify = useStore((s) => s.notify)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [toRemove, setToRemove] = useState<Member | null>(null)

  const refresh = useCallback(async () => {
    try {
      setMembers(await listMembers())
    } catch (e) {
      setMembers([])
      setError(createMessage(e))
    }
  }, [])

  useEffect(() => {
    if (role === 'dono') void refresh()
  }, [role, refresh])

  if (role !== 'dono') {
    return (
      <>
        <PageHeader title="Usuários" />
        <div className="card">
          <EmptyState icon={UsersIcon} title="Só o dono da cantina gerencia os usuários" description="Peça ao dono para criar ou remover acessos." />
        </div>
      </>
    )
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (senha.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
    setBusy(true)
    try {
      await createMember({ nome, email, senha })
      notify(`Acesso criado para ${nome.trim() || email.trim()}.`)
      setNome('')
      setEmail('')
      setSenha('')
      await refresh()
    } catch (err) {
      setError(createMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!toRemove) return
    try {
      await removeMember(toRemove.uid)
      notify(`Acesso de ${toRemove.nome || toRemove.email} removido.`)
      await refresh()
    } catch (err) {
      notify(createMessage(err), 'error')
    }
  }

  return (
    <>
      <PageHeader title="Usuários" description="Quem pode entrar no sistema desta cantina. Todos veem os mesmos dados." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
        <form onSubmit={add} className="card h-fit space-y-4 p-4">
          <p className="text-sm font-semibold">Adicionar usuário</p>
          <Field label="Nome">
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria, caixa" required />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@exemplo.com" required />
          </Field>
          <Field label="Senha provisória" hint="Mínimo de 6 caracteres. Passe a senha para a pessoa, que entra pela aba Entrar.">
            <Input type="text" autoComplete="off" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Field>
          {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
          <Button type="submit" variant="primary" full disabled={busy || !nome.trim() || !email || !senha}>
            <UserPlus size={16} strokeWidth={1.75} /> {busy ? 'Criando...' : 'Adicionar usuário'}
          </Button>
        </form>

        <section className="card">
          <div className="card-head">
            <p className="card-title flex items-center gap-2">
              Acessos <span className="count-pill">{members?.length ?? 0}</span>
            </p>
          </div>
          <div className="table-wrap">
            {members === null ? (
              <p className="px-4 py-6 text-[13px] text-muted">Carregando...</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Acesso</th>
                    <th>Desde</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.uid}>
                      <td className="font-medium">{m.nome || '—'}</td>
                      <td className="text-muted">{m.email || '—'}</td>
                      <td>{m.role === 'dono' ? <Badge tone="accent">Dono</Badge> : <Badge>Funcionário</Badge>}</td>
                      <td className="tabular text-muted">{m.criadoEm ? formatDate(m.criadoEm) : '—'}</td>
                      <td className="text-right">
                        {m.role !== 'dono' && (
                          <Button variant="ghost" size="sm" icon title="Remover acesso" onClick={() => setToRemove(m)} className="text-danger hover:text-danger-text">
                            <Trash2 size={16} strokeWidth={1.75} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(toRemove)}
        onClose={() => setToRemove(null)}
        onConfirm={remove}
        title={toRemove ? `Remover o acesso de ${toRemove.nome || toRemove.email}?` : ''}
        message="A pessoa deixa de ver os dados desta cantina. O login dela continua existindo, mas sem nenhum acesso aos seus dados."
        confirmLabel="Remover acesso"
        danger
      />
    </>
  )
}

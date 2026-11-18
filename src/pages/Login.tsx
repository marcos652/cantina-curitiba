import { useEffect, useState } from 'react'
import { Croissant, IdCard } from 'lucide-react'
import { authMessage, login, sendReset, type Portal } from '@/store/boot'
import { useSession } from '@/store/session'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { OtherAccounts } from '@/components/layout/OtherAccounts'
import { accountSlot, accountLabel } from '@/lib/accounts'

/** Duas telas de entrada: a do painel da equipe e a do portal do cliente (endereço /#/cliente). */
export function Login({ portal = 'painel' }: { portal?: Portal }) {
  const customer = portal === 'cliente'
  const notice = useSession((s) => s.notice)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  // Entrou pela tela errada: o sistema desconecta e avisa; destrava o botão.
  useEffect(() => {
    if (notice) setBusy(false)
  }, [notice])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await login(email, password, portal)
    } catch (err) {
      setError(authMessage(err))
      setBusy(false)
    }
  }

  async function forgot() {
    setError('')
    setInfo('')
    if (!email.trim()) return setError('Digite o seu e-mail acima para receber o link.')
    try {
      await sendReset(email)
      setInfo('Se esse e-mail estiver cadastrado, você vai receber um link para criar uma nova senha.')
    } catch (err) {
      setError(authMessage(err))
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
            {customer ? <IdCard size={28} strokeWidth={1.75} /> : <Croissant size={28} strokeWidth={1.75} />}
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">{customer ? 'Meu cartão' : 'Entrar no sistema'}</h1>
          <p className="mt-1 text-sm text-muted">
            {customer ? 'Entre com o e-mail e a senha que a cantina te passou para ver o seu cartão e as suas compras.' : 'Use o e-mail e a senha fornecidos pelo administrador.'}
          </p>
        </div>

        <div className="card p-5">
          <form onSubmit={submit} className="space-y-4">
            <Field label="E-mail">
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoFocus required />
            </Field>
            <Field label="Senha">
              <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {notice && <p className="rounded-md bg-warn-soft px-3 py-2 text-[13px] text-warn-text">{notice}</p>}
            {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
            {info && <p className="rounded-md bg-ok-soft px-3 py-2 text-[13px] text-ok-text">{info}</p>}
            <Button type="submit" variant="primary" size="lg" full disabled={busy || !email || !password}>
              {busy ? 'Entrando...' : 'Entrar'}
            </Button>
            <button type="button" onClick={forgot} className="link mx-auto flex">
              Esqueci minha senha
            </button>
            <p className="text-center text-[10px] text-faint">versão {__APP_BUILD__}</p>
            {customer ? (
              <p className="border-t border-rule pt-3 text-center text-xs text-muted">Primeiro acesso? Use a senha provisória que a cantina te passou. Você vai criar a sua própria em seguida.</p>
            ) : (
              <div className="flex flex-col items-center gap-2 border-t border-rule pt-3">
                {accountSlot && <p className="text-xs text-muted">Você está na {accountLabel}.</p>}
                <OtherAccounts withLabel />
                <a href="#/cliente" className="link">
                  Sou cliente: ver o meu cartão
                </a>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}

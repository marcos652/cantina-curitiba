import { useState } from 'react'
import { Croissant } from 'lucide-react'
import { authMessage, login, sendReset } from '@/store/boot'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setBusy(true)
    try {
      await login(email, password)
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
            <Croissant size={28} strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Entrar no sistema</h1>
          <p className="mt-1 text-sm text-muted">Use o e-mail e a senha da sua cantina.</p>
        </div>

        <form onSubmit={submit} className="card space-y-4 p-5">
          <Field label="E-mail">
            <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoFocus required />
          </Field>
          <Field label="Senha">
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
          {info && <p className="rounded-md bg-ok-soft px-3 py-2 text-[13px] text-ok-text">{info}</p>}
          <Button type="submit" variant="primary" size="lg" full disabled={busy || !email || !password}>
            {busy ? 'Entrando...' : 'Entrar'}
          </Button>
          <button type="button" onClick={forgot} className="link mx-auto flex">
            Esqueci minha senha
          </button>
        </form>
      </div>
    </div>
  )
}

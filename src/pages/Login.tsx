import { useState } from 'react'
import { Croissant } from 'lucide-react'
import { authMessage, login, sendReset, signup } from '@/store/boot'
import { cx } from '@/lib/cx'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

type Mode = 'entrar' | 'cadastrar'

export function Login() {
  const [mode, setMode] = useState<Mode>('entrar')
  const [storeName, setStoreName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setInfo('')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (mode === 'cadastrar') {
      if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.')
      if (password !== confirm) return setError('As senhas não são iguais.')
    }
    setBusy(true)
    try {
      if (mode === 'entrar') await login(email, password)
      else await signup(storeName, email, password)
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

  const signupMode = mode === 'cadastrar'

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
            <Croissant size={28} strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">{signupMode ? 'Criar a conta da sua cantina' : 'Entrar no sistema'}</h1>
          <p className="mt-1 text-sm text-muted">{signupMode ? 'Leva menos de um minuto.' : 'Use o e-mail e a senha da sua cantina.'}</p>
        </div>

        <div className="card p-5">
          <div role="tablist" className="mb-5 grid grid-cols-2 gap-0.5 rounded-md border border-line bg-raised p-0.5">
            {(['entrar', 'cadastrar'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={cx('h-9 rounded text-sm transition-colors', mode === m ? 'border border-line bg-white font-semibold text-ink' : 'text-muted hover:text-ink')}
              >
                {m === 'entrar' ? 'Entrar' : 'Cadastrar'}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {signupMode && (
              <Field label="Nome da cantina">
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ex.: Cantina do Zé" autoFocus />
              </Field>
            )}
            <Field label="E-mail">
              <Input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@exemplo.com" autoFocus={!signupMode} required />
            </Field>
            <Field label="Senha" hint={signupMode ? 'Mínimo de 6 caracteres.' : undefined}>
              <Input type="password" autoComplete={signupMode ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            {signupMode && (
              <Field label="Repita a senha">
                <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </Field>
            )}
            {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
            {info && <p className="rounded-md bg-ok-soft px-3 py-2 text-[13px] text-ok-text">{info}</p>}
            <Button type="submit" variant="primary" size="lg" full disabled={busy || !email || !password || (signupMode && !confirm)}>
              {busy ? (signupMode ? 'Criando a conta...' : 'Entrando...') : signupMode ? 'Criar conta' : 'Entrar'}
            </Button>
            {!signupMode && (
              <button type="button" onClick={forgot} className="link mx-auto flex">
                Esqueci minha senha
              </button>
            )}
          </form>
        </div>

        <p className="mt-4 text-center text-[13px] text-muted">
          {signupMode ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
          <button type="button" onClick={() => switchMode(signupMode ? 'entrar' : 'cadastrar')} className="link inline font-semibold">
            {signupMode ? 'Entrar' : 'Cadastrar'}
          </button>
        </p>
      </div>
    </div>
  )
}

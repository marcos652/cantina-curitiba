import { useState } from 'react'
import { KeyRound, LogOut } from 'lucide-react'
import { changeOwnPassword } from '@/store/customerView'
import { logout } from '@/store/boot'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

/** Primeiro acesso: a senha que a cantina passou é provisória, o cliente cria a própria antes de continuar. */
export function PasswordGate() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    if (password.length < 8) return setError('A senha precisa ter pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As duas senhas não são iguais.')
    setBusy(true)
    try {
      await changeOwnPassword(password)
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      setError(
        code === 'auth/requires-recent-login'
          ? 'Por segurança, saia e entre de novo com a senha provisória, e crie a nova senha em seguida.'
          : code === 'auth/weak-password'
            ? 'Essa senha é fraca demais. Use pelo menos 8 caracteres, com letras e números.'
            : 'Não foi possível trocar a senha agora. Verifique a internet e tente de novo.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ground px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
            <KeyRound size={26} strokeWidth={1.75} />
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Crie a sua senha</h1>
          <p className="mt-1 text-sm text-muted">A senha que a cantina te passou é provisória. Crie uma só sua para continuar.</p>
        </div>
        <form onSubmit={submit} className="card space-y-4 p-5">
          <Field label="Nova senha" hint="Pelo menos 8 caracteres.">
            <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus required />
          </Field>
          <Field label="Repita a nova senha">
            <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </Field>
          {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
          <Button type="submit" variant="primary" size="lg" full disabled={busy || !password || !confirm}>
            {busy ? 'Salvando...' : 'Salvar e continuar'}
          </Button>
          <button type="button" onClick={() => void logout()} className="link mx-auto flex">
            <LogOut size={13} strokeWidth={1.75} /> Sair
          </button>
        </form>
      </div>
    </div>
  )
}

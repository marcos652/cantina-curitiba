import { useMemo, useRef, useState } from 'react'
import { LogOut, ShieldCheck } from 'lucide-react'
import { useCustomerView, signContract } from '@/store/customerView'
import { logout } from '@/store/boot'
import { buildContractText } from '@/lib/lgpd'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'

/** Tela do termo de LGPD: o cliente lê, concorda e assina digitando o nome. Só depois acessa o cartão. */
export function LgpdGate() {
  const customer = useCustomerView((s) => s.customer)
  const [name, setName] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [readAll, setReadAll] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const text = useMemo(
    () => (customer ? buildContractText({ store: customer.storeName ?? 'Cantina', name: customer.name, email: customer.email }) : ''),
    [customer],
  )
  if (!customer) return null

  const onScroll = () => {
    const el = box.current
    if (el && el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setReadAll(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setError('')
    setBusy(true)
    try {
      await signContract(name)
    } catch (err) {
      const code = (err as { code?: string })?.code ?? ''
      setError(
        code.includes('permission')
          ? 'Não foi possível registrar a assinatura. Avise a cantina: as regras de acesso do sistema ainda não foram atualizadas.'
          : 'Não foi possível registrar a assinatura. Verifique a internet e tente de novo.',
      )
      setBusy(false)
    }
  }

  const canSign = agree && name.trim().length >= 3 && !busy

  return (
    <div className="min-h-screen bg-ground">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:px-8">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={16} strokeWidth={1.75} className="text-accent" /> Termo de privacidade (LGPD)
        </p>
        <Button size="sm" onClick={() => void logout()}>
          <LogOut size={15} strokeWidth={1.75} /> Sair
        </Button>
      </header>
      <main className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="text-lg font-semibold tracking-tight">Antes de começar, leia e assine o termo</h1>
        <p className="mt-1 text-sm text-muted">Para usar o seu cartão fidelidade, precisamos do seu consentimento para tratar os seus dados pessoais, como manda a Lei Geral de Proteção de Dados.</p>

        <div ref={box} onScroll={onScroll} className="card mt-4 max-h-[48vh] overflow-y-auto p-4 text-[13px] leading-relaxed text-ink">
          <div className="whitespace-pre-wrap">{text}</div>
        </div>
        {!readAll && <p className="mt-2 text-xs text-faint">Role o texto até o final para poder assinar.</p>}

        <form onSubmit={submit} className="card mt-4 space-y-4 p-4">
          <label className="flex items-start gap-2.5 text-sm">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={!readAll} className="mt-0.5 h-4 w-4" />
            <span>Li e concordo com o tratamento dos meus dados pessoais nos termos acima.</span>
          </label>
          <Field label="Assinatura: digite o seu nome completo" hint={`Cadastro em nome de ${customer.name}.`}>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" disabled={!readAll} placeholder="Seu nome completo" />
          </Field>
          {error && <p className="rounded-md bg-danger-soft px-3 py-2 text-[13px] text-danger-text">{error}</p>}
          <Button type="submit" variant="primary" size="lg" full disabled={!canSign}>
            {busy ? 'Registrando...' : 'Assinar e continuar'}
          </Button>
          <p className="text-center text-xs text-faint">Fica registrado o seu nome, o e-mail da conta, a data e o horário.</p>
        </form>
      </main>
    </div>
  )
}

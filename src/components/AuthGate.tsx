import { useEffect, useState, type ReactNode } from 'react'
import { Croissant, TriangleAlert } from 'lucide-react'
import { useSession } from '@/store/session'
import { boot, logout, retry } from '@/store/boot'
import { Login } from '@/pages/Login'
import { Button } from '@/components/ui/Button'

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ground">
      <span className="flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-accent text-white">
        <Croissant size={28} strokeWidth={1.75} />
      </span>
      <p className="text-sm text-muted">{text}</p>
    </div>
  )
}

/** Portal do cliente: endereço terminado em #/cliente. */
function useCustomerPortal(): boolean {
  const check = () => window.location.hash.replace(/^#\/?/, '').startsWith('cliente')
  const [is, setIs] = useState(check)
  useEffect(() => {
    const on = () => setIs(check())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return is
}

/** Só mostra o sistema depois do login e da carga dos dados do banco. */
export function AuthGate({ children }: { children: ReactNode }) {
  const phase = useSession((s) => s.phase)
  const message = useSession((s) => s.errorMessage)
  const detailText = useSession((s) => s.errorDetail)
  const customerPortal = useCustomerPortal()

  useEffect(() => {
    void boot()
  }, [])

  if (phase === 'init') return <Splash text="Abrindo o sistema..." />
  if (phase === 'login') return <Login portal={customerPortal ? 'cliente' : 'painel'} />
  if (phase === 'loading') return <Splash text="Carregando os dados da cantina..." />
  if (phase === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground px-4">
        <div className="card w-full max-w-md p-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft text-danger-text">
            <TriangleAlert size={20} strokeWidth={1.75} />
          </span>
          <h1 className="mt-3 text-base font-semibold">Não foi possível abrir os dados</h1>
          <p className="mt-1.5 text-sm text-muted">{message}</p>
          <p className="mt-2 break-words rounded bg-raised px-2 py-1 text-[11px] text-faint">
            Detalhe técnico: {detailText || 'sem código do erro'} · versão {__APP_BUILD__}
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="primary" onClick={retry}>
              Tentar de novo
            </Button>
            <Button onClick={() => void logout()}>Sair</Button>
          </div>
        </div>
      </div>
    )
  }
  return <>{children}</>
}

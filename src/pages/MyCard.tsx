import { LogOut } from 'lucide-react'
import { useCustomerView } from '@/store/customerView'
import { logout } from '@/store/boot'
import { customerBalance } from '@/lib/card'
import { Button } from '@/components/ui/Button'
import { FlipCard } from '@/components/card/FlipCard'
import { CardStatement } from '@/components/card/Statement'

/** Única tela do cliente: o cartão em destaque no meio e, embaixo, o que ele pegou. */
export function MyCard() {
  const customer = useCustomerView((s) => s.customer)
  const entries = useCustomerView((s) => s.entries)
  if (!customer) return null
  const balance = customerBalance(entries, customer.id)
  return (
    <div className="min-h-screen bg-ground">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:px-8">
        <p className="text-sm font-semibold">Meu cartão</p>
        <Button size="sm" onClick={() => void logout()}>
          <LogOut size={15} strokeWidth={1.75} /> Sair
        </Button>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 pb-10">
        <section className="flex flex-col items-center py-8">
          <FlipCard name={customer.name} number={customer.cardNumber} storeName="Cantina Curitiba" active={customer.active} balance={balance} limit={customer.limit} />
          <p className="mt-4 text-xs text-muted">Deslize o cartão para o lado para virar</p>
        </section>
        <CardStatement customerId={customer.id} entries={entries} limit={customer.limit} />
      </main>
    </div>
  )
}

import { LogOut } from 'lucide-react'
import { useCustomerView } from '@/store/customerView'
import { logout } from '@/store/boot'
import { Button } from '@/components/ui/Button'
import { CreditCard } from '@/components/card/CreditCard'
import { CardStatement } from '@/components/card/Statement'

/** Única tela do cliente: o cartão dele e as compras do mês. */
export function MyCard() {
  const customer = useCustomerView((s) => s.customer)
  const entries = useCustomerView((s) => s.entries)
  if (!customer) return null
  return (
    <div className="min-h-screen bg-ground">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:px-8">
        <p className="text-sm font-semibold">Meu cartão</p>
        <Button size="sm" onClick={() => void logout()}>
          <LogOut size={15} strokeWidth={1.75} /> Sair
        </Button>
      </header>
      <main className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
        <div className="flex justify-center">
          <CreditCard name={customer.name} number={customer.cardNumber} storeName="Cantina Curitiba" active={customer.active} />
        </div>
        <CardStatement customerId={customer.id} entries={entries} limit={customer.limit} />
      </main>
    </div>
  )
}

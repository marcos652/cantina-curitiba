import { useState } from 'react'
import { LogOut, QrCode as QrIcon } from 'lucide-react'
import { useCustomerView } from '@/store/customerView'
import { logout } from '@/store/boot'
import { customerBalance } from '@/lib/card'
import { Button } from '@/components/ui/Button'
import { FlipCard } from '@/components/card/FlipCard'
import { CardStatement } from '@/components/card/Statement'
import { QrCode } from '@/components/card/QrCode'
import { Modal } from '@/components/ui/Modal'

/** Única tela do cliente: o cartão em destaque no meio e, embaixo, o que ele pegou. */
export function MyCard() {
  const customer = useCustomerView((s) => s.customer)
  const entries = useCustomerView((s) => s.entries)
  const [qr, setQr] = useState(false)
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
          <Button variant="primary" className="mt-4" onClick={() => setQr(true)} disabled={!customer.active}>
            <QrIcon size={16} strokeWidth={1.75} /> Mostrar QR Code para pagar
          </Button>
        </section>
        <CardStatement customerId={customer.id} entries={entries} limit={customer.limit} />
      </main>

      <Modal open={qr} onClose={() => setQr(false)} title="QR Code do cartão" description="Mostre ao balconista para ele ler com a câmera." size="sm">
        <div className="flex flex-col items-center gap-3 pb-4">
          <QrCode value={customer.cardNumber} size={256} />
          <p className="text-sm font-medium">{customer.name}</p>
          <p className="text-xs text-muted tabular">{customer.cardNumber.replace(/(\d{4})(?=\d)/g, '$1 ')}</p>
          <p className="text-center text-xs text-faint">Aumente o brilho da tela para o QR Code ser lido mais rápido.</p>
        </div>
      </Modal>
    </div>
  )
}

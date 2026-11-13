import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Field, MoneyInput } from '@/components/ui/Field'
import { useStore } from '@/store/useStore'

export function OpenCashModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const openCash = useStore((s) => s.openCash)
  const notify = useStore((s) => s.notify)
  const [amount, setAmount] = useState(0)

  function submit() {
    const r = openCash(amount)
    if (!r.ok) return notify(r.error, 'error')
    notify('Caixa aberto.')
    setAmount(0)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Abrir caixa"
      description="Informe o dinheiro que está na gaveta agora."
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Voltar</Button>
          <Button variant="primary" onClick={submit}>
            Abrir caixa
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Field label="Valor inicial">
          <MoneyInput value={amount} onChange={setAmount} autoFocus />
        </Field>
      </form>
    </Modal>
  )
}

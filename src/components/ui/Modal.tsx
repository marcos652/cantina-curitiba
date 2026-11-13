import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cx } from '@/lib/cx'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl' }

export function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'flex max-h-[92vh] w-full flex-col rounded-t-lg border border-line bg-white sm:rounded-lg',
          'shadow-[0_8px_30px_rgba(0,0,0,0.06)]',
          SIZES[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pb-3 pt-5">
          <div>
            <h2 className="text-base font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <Button variant="ghost" size="sm" icon onClick={onClose} aria-label="Fechar" className="-mr-2 -mt-1">
            <X size={18} strokeWidth={1.5} />
          </Button>
        </div>
        <div className="overflow-y-auto px-5 py-2">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 px-5 pb-5 pt-4">{footer}</div>}
      </div>
    </div>
  )
}

interface ConfirmProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message?: ReactNode
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', danger }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button onClick={onClose}>Voltar</Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {message && <div className="text-sm text-muted">{message}</div>}
    </Modal>
  )
}

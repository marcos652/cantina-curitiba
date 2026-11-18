import { useEffect, useRef, useState } from 'react'
import { Check, UsersRound } from 'lucide-react'
import { ACCOUNT_SLOTS, accountLabel, accountSlot, accountUrl } from '@/lib/accounts'
import { Button } from '@/components/ui/Button'

/** Abre outra conta em uma nova aba, sem sair da atual. */
export function OtherAccounts({ withLabel = false }: { withLabel?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = accountSlot || '1'

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button variant="ghost" size="sm" icon={!withLabel} onClick={() => setOpen((o) => !o)} title="Entrar com outro e-mail ao mesmo tempo" aria-label={withLabel ? undefined : "Outras contas"}>
        <UsersRound size={16} strokeWidth={1.75} />
        {withLabel && 'Entrar com outro e-mail ao mesmo tempo'}
      </Button>
      {open && (
        <div role="menu" className={`absolute z-50 w-64 ${withLabel ? 'bottom-full left-1/2 mb-1 -translate-x-1/2' : 'right-0 top-full mt-1'} rounded-xl border border-line bg-white p-1.5 shadow-[0_8px_24px_rgba(16,24,40,0.12)]`}>
          <p className="px-3 pb-1 pt-1.5 text-xs text-muted">Cada conta abre em uma aba própria e não derruba as outras. Você está na {accountLabel}.</p>
          {ACCOUNT_SLOTS.map((s) => (
            <a
              key={s}
              role="menuitem"
              href={accountUrl(s)}
              target={s === current ? undefined : '_blank'}
              rel="noopener noreferrer"
              onClick={(e) => {
                if (s === current) e.preventDefault()
                setOpen(false)
              }}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-raised"
            >
              <span>
                Conta {s}
                {s === '1' && <span className="text-muted"> (principal)</span>}
              </span>
              {s === current && <Check size={14} strokeWidth={2} className="text-ok-text" />}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

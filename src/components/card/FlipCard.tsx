import { useRef, useState } from 'react'
import { CreditCard } from './CreditCard'
import { money } from '@/lib/format'
import { cx } from '@/lib/cx'
import type { Balance } from '@/lib/card'

interface Props {
  name: string
  number: string
  storeName: string
  active: boolean
  balance: Balance
  limit: number
}

function Back({ balance, limit, active }: { balance: Balance; limit: number; active: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl bg-gradient-to-br from-[#2b3038] via-[#14171c] to-[#0a0c0f] text-white shadow-xl ring-1 ring-white/10">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.07)_50%,transparent_60%)]" />
      <div className="mt-5 h-10 w-full bg-black" />
      <div className="relative flex h-[calc(100%-4.5rem)] flex-col justify-between p-5 pt-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8f98a3]">Saldo devedor</p>
            <p className={cx('text-xl font-bold tabular', balance.owed > 0 ? 'text-[#ff9b9b]' : 'text-[#7ee2a0]')}>{money(balance.owed)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8f98a3]">Total pago</p>
            <p className="text-xl font-bold text-[#7ee2a0] tabular">{money(balance.paid)}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8f98a3]">Consumido</p>
            <p className="text-sm font-semibold text-[#e6eaef] tabular">{money(balance.consumed)}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-[0.2em] text-[#8f98a3]">{limit > 0 ? 'Disponível' : 'Limite'}</p>
            <p className="text-sm font-semibold text-[#e6eaef] tabular">{limit > 0 ? money(Math.max(0, limit - balance.owed)) : 'Sem limite'}</p>
          </div>
        </div>
        <p className="text-center text-[10px] uppercase tracking-[0.2em] text-[#8f98a3]">{active ? 'Pague o saldo no fechamento do mês' : 'Cartão bloqueado'}</p>
      </div>
    </div>
  )
}

/** Cartão que gira ao deslizar o dedo (ou ao tocar/clicar). A frente é o cartão; o verso mostra o saldo. */
export function FlipCard({ name, number, storeName, active, balance, limit }: Props) {
  const [flipped, setFlipped] = useState(false)
  const [drag, setDrag] = useState(0)
  const start = useRef<number | null>(null)

  const base = flipped ? 180 : 0
  const angle = base + drag

  function down(e: React.PointerEvent) {
    start.current = e.clientX
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent) {
    if (start.current === null) return
    const dx = e.clientX - start.current
    setDrag(Math.max(-180, Math.min(180, dx * 0.9)))
  }
  function up(e: React.PointerEvent) {
    if (start.current === null) return
    const dx = e.clientX - start.current
    start.current = null
    setDrag(0)
    // deslizou ou tocou: vira para o outro lado
    if (Math.abs(dx) > 40 || Math.abs(dx) < 6) setFlipped((f) => !f)
  }

  const face = { backfaceVisibility: 'hidden' as const, WebkitBackfaceVisibility: 'hidden' as const }
  return (
    <div className="w-full max-w-[400px]" style={{ perspective: 1200 }}>
      <div
        role="button"
        tabIndex={0}
        aria-label="Virar o cartão"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => {
          start.current = null
          setDrag(0)
        }}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setFlipped((f) => !f)}
        className="relative aspect-[1.586/1] w-full cursor-grab select-none outline-none active:cursor-grabbing"
        style={{
          transformStyle: 'preserve-3d',
          transform: `rotateY(${angle}deg)`,
          transition: drag === 0 ? 'transform 600ms cubic-bezier(.2,.8,.2,1)' : 'none',
          touchAction: 'pan-y',
        }}
      >
        <div className="absolute inset-0" style={face}>
          <CreditCard name={name} number={number} storeName={storeName} active={active} className="h-full max-w-none" />
        </div>
        <div className="absolute inset-0" style={{ ...face, transform: 'rotateY(180deg)' }}>
          <Back balance={balance} limit={limit} active={active} />
        </div>
      </div>
    </div>
  )
}

import { Croissant, Wifi } from 'lucide-react'
import { formatCardNumber } from '@/lib/card'
import { cx } from '@/lib/cx'

interface Props {
  name: string
  number: string
  storeName: string
  active?: boolean
  logo?: string
  className?: string
}

/** Cartão no estilo de banco: prata, com fundo escuro. */
export function CreditCard({ name, number, storeName, active = true, logo, className }: Props) {
  return (
    <div
      className={cx(
        'relative aspect-[1.586/1] w-full max-w-[400px] overflow-hidden rounded-2xl p-5 text-white shadow-xl',
        'bg-gradient-to-br from-[#2b3038] via-[#14171c] to-[#0a0c0f] ring-1 ring-white/10',
        !active && 'opacity-60 grayscale',
        className,
      )}
    >
      {/* brilho prateado */}
      <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-white/25 to-transparent blur-2xl" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.07)_50%,transparent_60%)]" />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {logo ? (
              <img src={logo} alt="" className="h-7 max-w-[80px] object-contain" />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-[#e9edf2] to-[#9aa3ae] text-[#14171c]">
                <Croissant size={16} strokeWidth={2} />
              </span>
            )}
            <span className="max-w-[170px] truncate text-sm font-semibold tracking-wide text-[#dfe4ea]">{storeName || 'Cantina'}</span>
          </div>
          <Wifi size={22} strokeWidth={1.75} className="rotate-90 text-[#c7ced6]" />
        </div>

        <div className="flex items-center gap-3">
          {/* chip */}
          <span className="relative block h-9 w-12 rounded-md bg-gradient-to-br from-[#f1f3f6] via-[#b5bcc6] to-[#8a929d]">
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/25" />
            <span className="absolute inset-y-0 left-1/3 w-px bg-black/25" />
            <span className="absolute inset-y-0 left-2/3 w-px bg-black/25" />
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#aab2bc]">Cartão fidelidade</span>
        </div>

        <div>
          <p className="bg-gradient-to-b from-white to-[#aeb6c0] bg-clip-text text-[clamp(16px,5.4vw,22px)] font-semibold tracking-[0.14em] text-transparent tabular">
            {formatCardNumber(number)}
          </p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-[#8f98a3]">Titular</p>
              <p className="truncate text-sm font-medium uppercase tracking-wider text-[#e6eaef]">{name}</p>
            </div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[#c7ced6]">{active ? 'Prata' : 'Bloqueado'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

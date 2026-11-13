import { useStore } from '@/store/useStore'
import { cx } from '@/lib/cx'

const DOT = { ok: 'bg-ok', error: 'bg-danger', info: 'bg-faint' }

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)
  if (toasts.length === 0) return null
  return (
    <div className="pointer-events-none fixed print:hidden bottom-4 left-4 right-4 z-[60] flex flex-col items-center gap-2 sm:left-auto sm:items-end">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={cx(
            'pointer-events-auto flex max-w-sm items-center gap-2.5 rounded border border-line bg-white px-3.5 py-2.5 text-left text-sm',
            'shadow-[0_4px_16px_rgba(0,0,0,0.05)]',
          )}
        >
          <span className={cx('h-1.5 w-1.5 shrink-0 rounded-full', DOT[t.kind])} />
          {t.message}
        </button>
      ))}
    </div>
  )
}

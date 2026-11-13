import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'
import { money } from '@/lib/format'

interface FieldProps {
  label?: string
  hint?: string
  error?: string
  className?: string
  children: ReactNode
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-[13px] text-muted">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs text-faint">{hint}</span>
      ) : null}
    </label>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={cx('input', className)} {...rest} />
})

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, rows = 2, ...rest }, ref) {
    return <textarea ref={ref} rows={rows} className={cx('input', className)} {...rest} />
  },
)

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...rest },
  ref,
) {
  return <select ref={ref} className={cx('input select', className)} {...rest} />
})

interface MoneyInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
}

/** Entrada de dinheiro no padrão brasileiro: digita-se os centavos e o valor vai se formando. */
export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(function MoneyInput(
  { value, onChange, className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      inputMode="numeric"
      className={cx('input tabular text-right', className)}
      value={money(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '')
        onChange(Number(digits) / 100)
      }}
      onFocus={(e) => e.target.select()}
      {...rest}
    />
  )
})

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number
  onChange: (value: number) => void
}

export const NumberInput = forwardRef<HTMLInputElement, NumberInputProps>(function NumberInput(
  { value, onChange, className, min = 0, step = 1, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      className={cx('input tabular', className)}
      value={Number.isFinite(value) ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      onFocus={(e) => e.target.select()}
      {...rest}
    />
  )
})

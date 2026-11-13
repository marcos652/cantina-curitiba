import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export type ButtonVariant = 'primary' | 'soft' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
  /** Botão quadrado só com ícone. */
  icon?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', full, icon, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('btn', `btn-${variant}`, `btn-${size}`, icon && 'btn-icon', full && 'w-full', className)}
      {...rest}
    />
  )
})

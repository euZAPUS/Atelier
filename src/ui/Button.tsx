import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
export const buttonStyles: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink border-transparent',
  secondary: 'bg-surface text-ink border-line-strong',
  ghost: 'bg-transparent text-ink border-transparent',
  danger: 'bg-surface text-dirty border-line-strong',
}
export const buttonBase = 'press inline-flex min-h-13 items-center justify-center gap-2 rounded-[14px] border px-5 text-[1rem] font-semibold disabled:opacity-40 disabled:pointer-events-none'

// Alto mínimo 52px: se pulsa bien con el pulgar.
export function Button({ variant = 'secondary', icon, children, block, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; children?: ReactNode; block?: boolean }) {
  return (
    <button {...rest} className={`${buttonBase} ${block ? 'w-full' : ''} ${buttonStyles[variant]} ${className}`}>
      {icon && <Icon name={icon} size={20} strokeWidth={1.8} />}
      {children}
    </button>
  )
}

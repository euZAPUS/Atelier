import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'ink' | 'line' | 'ghost' | 'danger'
export const buttonStyles: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink border-accent',
  ink: 'bg-ink text-bg border-ink',
  line: 'bg-transparent text-ink border-line',
  ghost: 'bg-transparent text-ink border-transparent',
  danger: 'bg-transparent text-dirty border-dirty',
}
export const buttonBase = 'press inline-flex min-h-14 items-center justify-center gap-2 border-2 px-5 text-[0.95rem] font-extrabold uppercase tracking-wide disabled:opacity-40 disabled:pointer-events-none'

// Alto mínimo 56px: se pulsa bien con el pulgar.
export function Button({ variant = 'line', icon, children, block, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; children?: ReactNode; block?: boolean }) {
  return (
    <button {...rest} className={`${buttonBase} ${block ? 'w-full' : ''} ${buttonStyles[variant]} ${className}`}>
      {icon && <Icon name={icon} size={20} strokeWidth={2} />}
      {children}
    </button>
  )
}

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type Variant = 'primary' | 'ghost' | 'line' | 'danger'
const styles: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink border-accent hover:brightness-105',
  line: 'bg-surface text-ink border-line hover:bg-bg-soft',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-line-soft',
  danger: 'bg-dirty text-white border-dirty',
}

// Alto mínimo 52px: se pulsa bien con el pulgar.
export function Button({ variant = 'line', icon, children, block, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; icon?: IconName; children?: ReactNode; block?: boolean }) {
  return (
    <button
      {...rest}
      className={`press inline-flex min-h-13 items-center justify-center gap-2 border px-5 font-semibold tracking-tight disabled:opacity-40 disabled:pointer-events-none ${block ? 'w-full' : ''} ${styles[variant]} ${className}`}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  )
}

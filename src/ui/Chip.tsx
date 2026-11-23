import type { ReactNode } from 'react'

export function Chip({ active, onClick, children, swatch, count }: { active?: boolean; onClick?: () => void; children: ReactNode; swatch?: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.875rem] font-medium ${
        active ? 'border-transparent bg-accent text-accent-ink' : 'border-line-strong bg-surface text-ink'
      }`}
    >
      {swatch && <span className="size-3.5 rounded-full ring-1 ring-line-strong" style={{ background: swatch }} />}
      {children}
      {count !== undefined && <span className={active ? 'opacity-60' : 'text-muted'}>{count}</span>}
    </button>
  )
}

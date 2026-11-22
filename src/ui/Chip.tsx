import type { ReactNode } from 'react'

export function Chip({ active, onClick, children, swatch, count }: { active?: boolean; onClick?: () => void; children: ReactNode; swatch?: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`press inline-flex h-10 shrink-0 items-center gap-2 rounded-full border-[1.5px] px-4 text-[0.8rem] font-bold uppercase tracking-wide ${
        active ? 'border-ink bg-ink text-bg' : 'border-line-soft bg-surface text-ink'
      }`}
    >
      {swatch && <span className="size-3.5 rounded-full ring-1 ring-line-soft" style={{ background: swatch }} />}
      {children}
      {count !== undefined && <span className={`tag ${active ? 'opacity-70' : 'text-muted'}`}>{count}</span>}
    </button>
  )
}

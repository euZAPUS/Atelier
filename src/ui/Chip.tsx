import type { ReactNode } from 'react'

export function Chip({ active, onClick, children, swatch }: { active?: boolean; onClick?: () => void; children: ReactNode; swatch?: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`press inline-flex h-10 shrink-0 items-center gap-2 border px-3.5 font-mono text-xs uppercase tracking-wider ${
        active ? 'border-line bg-ink text-bg' : 'border-line-soft bg-surface text-ink'
      }`}
    >
      {swatch && <span className="size-3 rounded-full border border-line-soft" style={{ background: swatch }} />}
      {children}
    </button>
  )
}

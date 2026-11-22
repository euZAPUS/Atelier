// Ilustración técnica de una percha con cotas: se dibuja al aparecer.
export function HangerDrawing({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 150" className={`draw ${className}`} fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path pathLength={1} d="M120 40a9 9 0 1 1 9-9c0 5-4.5 7-9 10.5V48" />
      <path pathLength={1} d="M120 48 30 104c-5 3-3 10 3 10h174c6 0 8-7 3-10L120 48" />
      <path pathLength={1} opacity=".45" d="M30 128h180M30 123v10M210 123v10" />
      <path pathLength={1} opacity=".45" d="M222 48v66M217 48h10M217 114h10" />
      <circle pathLength={1} cx="120" cy="48" r="2.5" />
    </svg>
  )
}

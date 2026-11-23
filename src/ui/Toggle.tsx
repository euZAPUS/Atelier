// Interruptor estilo iOS
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-clean' : 'bg-line-strong'}`}>
      <span className={`absolute top-[2px] left-[2px] size-[27px] rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/.25)] transition-transform duration-200 ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

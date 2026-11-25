export function Segmented<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string
  options: readonly T[]
  value: T | null
  labels: Record<T, string>
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="no-scrollbar flex h-[26px] max-w-full items-center gap-0.5 overflow-x-auto rounded-[7px] bg-muted p-0.5"
    >
      {options.map((option) => {
        const selected = option === value
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option)}
            className={`h-[22px] shrink-0 rounded-[5px] px-2 text-[12px] leading-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {labels[option]}
          </button>
        )
      })}
    </div>
  )
}

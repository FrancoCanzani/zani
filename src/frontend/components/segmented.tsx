import { ToggleGroup, ToggleGroupItem } from "@components/ui/toggle-group"

export function Segmented<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
  onHover,
}: {
  label: string
  options: readonly T[]
  value: T | null
  labels: Record<T, string>
  onChange: (value: T) => void
  onHover?: (value: T) => void
}) {
  return (
    <ToggleGroup
      type="single"
      aria-label={label}
      value={value ?? ""}
      onValueChange={(next) => {
        const match = options.find((option) => option === next)
        if (match !== undefined) onChange(match)
      }}
      className="no-scrollbar h-[26px] max-w-full gap-0.5 overflow-x-auto rounded-[7px] bg-muted p-0.5"
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option}
          value={option}
          onMouseEnter={onHover ? () => onHover(option) : undefined}
          onFocus={onHover ? () => onHover(option) : undefined}
          className="h-[22px] min-w-0 rounded-[5px] px-2 text-[12px] leading-4 font-normal text-muted-foreground hover:bg-transparent hover:text-foreground data-[state=on]:bg-background data-[state=on]:text-foreground data-[state=on]:shadow-sm"
        >
          {labels[option]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

import { useState, type ReactNode } from "react"
import { CheckIcon, ChevronDownIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "cn"

import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover"

import { rangeLabels, type RangePreset } from "./search"

type Panel = "presets" | "custom"

type RangePickerProps = {
  range: RangePreset
  from?: string
  to?: string
  timeZone: string
  localTz: string
  label: string
  onPreset: (range: Exclude<RangePreset, "custom">) => void
  onLive: () => void
  onCustom: (from: string, to: string) => void
  onTimeZone: (tz: string) => void
}

function parseBound(value: string | undefined): Date | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12)
}

function formatDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const primaryPresets = ["1d", "yesterday", "7d", "30d"] as const satisfies ReadonlyArray<
  Exclude<RangePreset, "custom">
>

const morePresets = ["90d", "12m"] as const satisfies ReadonlyArray<
  Exclude<RangePreset, "custom">
>

function PresetItem({
  active,
  children,
  onSelect,
}: {
  active?: boolean
  children: ReactNode
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={cn(
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-xs outline-none select-none hover:bg-accent hover:text-accent-foreground",
        active && "bg-accent text-accent-foreground"
      )}
      onClick={onSelect}
    >
      {children}
      {active ? (
        <CheckIcon className="pointer-events-none absolute right-2 size-3.5" />
      ) : null}
    </button>
  )
}

export function RangePicker({
  range,
  from,
  to,
  timeZone,
  localTz,
  label,
  onPreset,
  onLive,
  onCustom,
  onTimeZone,
}: RangePickerProps) {
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>("presets")
  const [moreOpen, setMoreOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => ({
    from: parseBound(from),
    to: parseBound(to),
  }))

  function openPresets() {
    setPanel("presets")
    setMoreOpen(range === "90d" || range === "12m")
  }

  function openCustom() {
    setDraft({ from: parseBound(from), to: parseBound(to) })
    setPanel("custom")
  }

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) openPresets()
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="gap-1.5"
          aria-label="Range"
        >
          {label}
          <ChevronDownIcon
            data-icon="inline-end"
            className={cn(
              "opacity-60 transition-transform",
              open && "rotate-180"
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "gap-0 p-1",
          panel === "presets" ? "min-w-36 w-auto" : "w-fit p-3"
        )}
      >
        {panel === "presets" ? (
          <>
            <PresetItem
              onSelect={() => {
                onLive()
                setOpen(false)
              }}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-emerald-500"
              />
              Now
            </PresetItem>
            {primaryPresets.map((id) => (
              <PresetItem
                key={id}
                active={range === id}
                onSelect={() => {
                  onPreset(id)
                  setOpen(false)
                }}
              >
                {rangeLabels[id]}
              </PresetItem>
            ))}
            <button
              type="button"
              className="flex w-full items-center rounded-md py-1 pr-2 pl-1.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMoreOpen((value) => !value)}
              aria-expanded={moreOpen}
            >
              More periods
              <ChevronDownIcon
                className={cn(
                  "ml-auto size-3.5 text-muted-foreground transition-transform",
                  moreOpen && "rotate-180"
                )}
              />
            </button>
            {moreOpen
              ? morePresets.map((id) => (
                  <PresetItem
                    key={id}
                    active={range === id}
                    onSelect={() => {
                      onPreset(id)
                      setOpen(false)
                    }}
                  >
                    {rangeLabels[id]}
                  </PresetItem>
                ))
              : null}
            <div className="my-1 h-px bg-border" />
            <PresetItem
              active={range === "custom"}
              onSelect={openCustom}
            >
              Custom
            </PresetItem>
          </>
        ) : (
          <>
            <Calendar
              mode="range"
              numberOfMonths={2}
              showOutsideDays={false}
              disabled={{ after: today }}
              className="w-fit p-0 [--cell-radius:var(--radius-sm)] [--cell-size:--spacing(8)]"
              classNames={{
                months: "relative flex flex-row gap-6",
                month: "flex w-fit flex-col gap-3",
              }}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={
                draft?.from
                  ? new Date(
                      draft.from.getFullYear(),
                      draft.from.getMonth(),
                      1
                    )
                  : undefined
              }
            />
            <div className="mt-3 flex w-full items-center gap-1.5 border-t pt-2">
              <Button
                type="button"
                size="xs"
                variant={timeZone === "UTC" ? "default" : "outline"}
                onClick={() => onTimeZone("UTC")}
              >
                UTC
              </Button>
              {localTz !== "UTC" ? (
                <Button
                  type="button"
                  size="xs"
                  variant={timeZone === localTz ? "default" : "outline"}
                  onClick={() => onTimeZone(localTz)}
                >
                  Local
                </Button>
              ) : null}
              <Button
                type="button"
                size="xs"
                className="ml-auto"
                disabled={!draft?.from || !draft?.to}
                onClick={() => {
                  if (!draft?.from || !draft?.to) return
                  onCustom(formatDay(draft.from), formatDay(draft.to))
                  setOpen(false)
                }}
              >
                Apply
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

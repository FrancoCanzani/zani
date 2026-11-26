import { useEffect, useState } from "react"
import { CalendarIcon, ChevronDownIcon } from "lucide-react"
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

type ParsedBound = {
  date: Date
}

function parseBound(value: string | undefined): ParsedBound | undefined {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim())
  if (!match) return undefined
  return {
    date: new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      12
    ),
  }
}

function formatDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const primaryPresets = [
  { id: "1d", shortcut: "T" },
  { id: "yesterday", shortcut: "Y" },
  { id: "7d", shortcut: "W" },
  { id: "30d", shortcut: "3" },
] as const satisfies ReadonlyArray<{
  id: Exclude<RangePreset, "custom">
  shortcut: string
}>

const morePresets = ["90d", "12m"] as const satisfies ReadonlyArray<
  Exclude<RangePreset, "custom">
>

function currentTimeLabel(timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date())
}

function Shortcut({ children }: { children: string }) {
  return (
    <kbd className="ml-auto flex h-5 min-w-5 items-center justify-center rounded border border-border bg-background px-1 font-sans text-[10px] font-medium text-muted-foreground">
      {children}
    </kbd>
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
  const [draft, setDraft] = useState<DateRange | undefined>(() => {
    const start = parseBound(from)
    const end = parseBound(to)
    return { from: start?.date, to: end?.date }
  })
  const [nowLabel, setNowLabel] = useState(() => currentTimeLabel(timeZone))

  useEffect(() => {
    if (!open || panel !== "presets") return
    setNowLabel(currentTimeLabel(timeZone))
    const id = window.setInterval(() => {
      setNowLabel(currentTimeLabel(timeZone))
    }, 30_000)
    return () => window.clearInterval(id)
  }, [open, panel, timeZone])

  useEffect(() => {
    if (!open || panel !== "presets") return

    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return
      }
      const key = event.key.toLowerCase()
      if (key === "n") {
        event.preventDefault()
        onLive()
        setOpen(false)
        return
      }
      const match = primaryPresets.find(
        (preset) => preset.shortcut.toLowerCase() === key
      )
      if (!match) return
      event.preventDefault()
      onPreset(match.id)
      setOpen(false)
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open, panel, onLive, onPreset])

  function openPresets() {
    setPanel("presets")
    setMoreOpen(range === "90d" || range === "12m")
  }

  function openCustom() {
    const start = parseBound(from)
    const end = parseBound(to)
    setDraft({ from: start?.date, to: end?.date })
    setPanel("custom")
  }

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
          "gap-0",
          panel === "presets" ? "w-56 p-1.5" : "w-fit p-2"
        )}
      >
        {panel === "presets" ? (
          <>
            <p className="px-2 pt-1 pb-1.5 text-[11px] text-muted-foreground">
              Current time: {nowLabel}
            </p>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onLive()
                setOpen(false)
              }}
            >
              <span
                aria-hidden
                className="size-1.5 shrink-0 rounded-full bg-emerald-500"
              />
              Now
              <Shortcut>N</Shortcut>
            </button>
            {primaryPresets.map((preset) => {
              const active = range === preset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onPreset(preset.id)
                    setOpen(false)
                  }}
                >
                  {rangeLabels[preset.id]}
                  <Shortcut>{preset.shortcut}</Shortcut>
                </button>
              )
            })}
            <button
              type="button"
              className="flex w-full items-center rounded-md px-2 py-1.5 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground"
              onClick={() => setMoreOpen((value) => !value)}
              aria-expanded={moreOpen}
            >
              More periods
              <ChevronDownIcon
                className={cn(
                  "ml-auto size-3.5 opacity-60 transition-transform",
                  moreOpen && "rotate-180"
                )}
              />
            </button>
            {moreOpen
              ? morePresets.map((id) => {
                  const active = range === id
                  return (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        "flex w-full items-center rounded-md px-2 py-1.5 pl-4 text-left text-xs outline-none hover:bg-accent hover:text-accent-foreground",
                        active && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => {
                        onPreset(id)
                        setOpen(false)
                      }}
                    >
                      {rangeLabels[id]}
                    </button>
                  )
                })
              : null}
            <button
              type="button"
              className="mt-1 flex w-full items-center rounded-md bg-foreground px-2.5 py-1.5 text-left text-xs font-medium text-background outline-none hover:bg-foreground/90"
              onClick={openCustom}
            >
              Custom
              <CalendarIcon className="ml-auto size-3.5 opacity-80" />
            </button>
          </>
        ) : (
          <>
            <Calendar
              mode="range"
              className="mx-auto w-fit p-0 [--cell-radius:var(--radius-sm)] [--cell-size:--spacing(7)]"
              numberOfMonths={1}
              selected={draft}
              onSelect={setDraft}
              defaultMonth={draft?.from ?? draft?.to}
            />
            <div className="mt-2 flex w-full items-center gap-1.5 border-t pt-2">
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

import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover"

import {
  rangeLabels,
  type RangePreset,
} from "./search"

const quickRanges = ["1d", "7d", "30d"] as const

type RangePickerProps = {
  range: RangePreset
  from?: string
  to?: string
  timeZone: string
  localTz: string
  label: string
  onPreset: (preset: Exclude<RangePreset, "custom">) => void
  onCustom: (from: string, to: string) => void
  onTimeZone: (tz: string) => void
}

function parseDay(value: string | undefined) {
  if (!value) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  return new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    12
  )
}

function formatDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function RangePicker({
  range,
  from,
  to,
  timeZone,
  localTz,
  label,
  onPreset,
  onCustom,
  onTimeZone,
}: RangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => ({
    from: parseDay(from),
    to: parseDay(to),
  }))

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setDraft({
            from: parseDay(from),
            to: parseDay(to),
          })
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="gap-2">
          <CalendarIcon className="size-3.5" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <div className="flex flex-wrap gap-1 pb-3">
          {quickRanges.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="xs"
              variant={range === preset ? "default" : "outline"}
              onClick={() => {
                onPreset(preset)
                setOpen(false)
              }}
            >
              {rangeLabels[preset]}
            </Button>
          ))}
        </div>
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={draft}
          onSelect={setDraft}
          defaultMonth={draft?.from ?? draft?.to}
        />
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
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
      </PopoverContent>
    </Popover>
  )
}

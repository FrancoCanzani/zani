import { useState } from "react"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { Button } from "@components/ui/button"
import { Calendar } from "@components/ui/calendar"
import { Input } from "@components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@components/ui/popover"

type RangePickerProps = {
  from?: string
  to?: string
  timeZone: string
  localTz: string
  active: boolean
  label: string
  onCustom: (from: string, to: string) => void
  onTimeZone: (tz: string) => void
}

type ParsedBound = {
  date: Date
  time: string
}

function parseBound(value: string | undefined, fallbackTime: string): ParsedBound | undefined {
  if (!value) return undefined
  const match =
    /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?$/.exec(value.trim())
  if (!match) return undefined
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const time =
    match[4] !== undefined && match[5] !== undefined
      ? `${match[4]}:${match[5]}`
      : fallbackTime
  return {
    date: new Date(year, month - 1, day, 12),
    time,
  }
}

function formatDay(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatBound(date: Date, time: string) {
  return `${formatDay(date)}T${time}`
}

export function RangePicker({
  from,
  to,
  timeZone,
  localTz,
  active,
  label,
  onCustom,
  onTimeZone,
}: RangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange | undefined>(() => {
    const start = parseBound(from, "00:00")
    const end = parseBound(to, "23:59")
    return { from: start?.date, to: end?.date }
  })
  const [fromTime, setFromTime] = useState(
    () => parseBound(from, "00:00")?.time ?? "00:00"
  )
  const [toTime, setToTime] = useState(
    () => parseBound(to, "23:59")?.time ?? "23:59"
  )

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          const start = parseBound(from, "00:00")
          const end = parseBound(to, "23:59")
          setDraft({ from: start?.date, to: end?.date })
          setFromTime(start?.time ?? "00:00")
          setToTime(end?.time ?? "23:59")
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={active ? "default" : "outline"}
          size="xs"
          className="gap-1.5"
        >
          <CalendarIcon className="size-3" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-3">
        <Calendar
          mode="range"
          numberOfMonths={1}
          selected={draft}
          onSelect={setDraft}
          defaultMonth={draft?.from ?? draft?.to}
        />
        <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3">
          <label className="space-y-1">
            <span className="text-[11px] text-muted-foreground">From</span>
            <Input
              type="time"
              size="xs"
              value={fromTime}
              onChange={(event) => setFromTime(event.target.value || "00:00")}
            />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-muted-foreground">To</span>
            <Input
              type="time"
              size="xs"
              value={toTime}
              onChange={(event) => setToTime(event.target.value || "23:59")}
            />
          </label>
        </div>
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
            disabled={!draft?.from || !draft?.to || !fromTime || !toTime}
            onClick={() => {
              if (!draft?.from || !draft?.to) return
              onCustom(
                formatBound(draft.from, fromTime),
                formatBound(draft.to, toTime)
              )
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

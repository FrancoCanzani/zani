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

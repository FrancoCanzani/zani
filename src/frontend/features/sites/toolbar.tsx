import { XIcon } from "lucide-react"

import { Button } from "@components/ui/button"

import type { StatsRange } from "./api"
import { RangePicker } from "./range-picker"
import {
  activeFilterChips,
  dependentFilters,
  filterKeys,
  filterLabels,
  goalLabel,
  rangeLabels,
  zonedParts,
  type SiteSearch,
} from "./search"

function dateInputValue(iso: string, timeZone: string) {
  const { year, month, day } = zonedParts(Date.parse(iso), timeZone)
  if ([year, month, day].some(Number.isNaN)) return ""
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

const customDay = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
})

function customRangeLabel(from: string, to: string) {
  const day = (value: string) =>
    customDay.format(new Date(`${value.slice(0, 10)}T12:00`))
  const start = day(from)
  const end = day(to)
  return start === end ? start : `${start} – ${end}`
}

function clearFiltersPatch(): Partial<SiteSearch> {
  const patch: Partial<SiteSearch> = {}
  for (const key of filterKeys) {
    patch[key] = undefined
  }
  return patch
}

function rangeTriggerLabel(search: SiteSearch) {
  if (search.range === "custom" && search.from && search.to) {
    return customRangeLabel(search.from, search.to)
  }
  return rangeLabels[search.range]
}

export function Toolbar({
  search,
  range,
  timeZone,
  showCompare,
  patchSearch,
}: {
  search: SiteSearch
  range: StatsRange
  timeZone: string
  showCompare: boolean
  patchSearch: (patch: Partial<SiteSearch>) => void
}) {
  const chips = activeFilterChips(search)
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

  return (
    <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-background/85 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      {search.live ? (
        <>
          <span className="flex h-[26px] items-center gap-2 rounded-[7px] bg-muted px-2.5 text-[12px] text-foreground">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Last 30 minutes
          </span>
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => patchSearch({ live: undefined })}
          >
            Back to {rangeLabels[search.range].toLowerCase()}
          </Button>
        </>
      ) : (
        <>
          <RangePicker
            range={search.range}
            from={search.from ?? dateInputValue(range.start, timeZone)}
            to={search.to ?? dateInputValue(range.end, timeZone)}
            timeZone={timeZone}
            localTz={localTz}
            label={rangeTriggerLabel(search)}
            onPreset={(next) =>
              patchSearch({
                range: next,
                from: undefined,
                to: undefined,
                live: undefined,
              })
            }
            onLive={() => patchSearch({ live: true })}
            onCustom={(from, to) =>
              patchSearch({
                range: "custom",
                from,
                to,
                live: undefined,
              })
            }
            onTimeZone={(tz) => patchSearch({ tz })}
          />
          {search.range === "custom" ? (
            <Button
              type="button"
              size="icon-xs"
              variant="ghost"
              aria-label="Clear custom range"
              className="-ml-1.5"
              onClick={() =>
                patchSearch({
                  range: undefined,
                  from: undefined,
                  to: undefined,
                })
              }
            >
              <XIcon />
            </Button>
          ) : null}
          {showCompare ? (
            <Button
              type="button"
              size="xs"
              variant={search.compare ? "secondary" : "ghost"}
              aria-pressed={search.compare}
              onClick={() =>
                patchSearch({ compare: search.compare ? undefined : true })
              }
            >
              Compare
            </Button>
          ) : null}
        </>
      )}
      <Button
        type="button"
        size="xs"
        variant={search.bots ? "secondary" : "ghost"}
        aria-pressed={search.bots}
        onClick={() => patchSearch({ bots: search.bots ? undefined : true })}
      >
        Bots
      </Button>
      {search.goal ? (
        <Button
          type="button"
          size="xs"
          variant="secondary"
          onClick={() => patchSearch({ goal: undefined })}
        >
          <span className="text-muted-foreground">Goal</span>
          {goalLabel(search.goal)}
          <XIcon data-icon="inline-end" />
        </Button>
      ) : null}
      {chips.map((chip) => (
        <Button
          key={`${chip.key}:${chip.value}`}
          type="button"
          size="xs"
          variant="secondary"
          onClick={() =>
            patchSearch({
              ...dependentFilters(chip.key),
              [chip.key]: undefined,
            })
          }
        >
          <span className="text-muted-foreground">
            {filterLabels[chip.key]}
          </span>
          {chip.value || "(none)"}
          <XIcon data-icon="inline-end" />
        </Button>
      ))}
      {chips.length > 1 ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => patchSearch(clearFiltersPatch())}
        >
          Clear
        </Button>
      ) : null}
    </div>
  )
}

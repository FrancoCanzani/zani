import { useQuery } from "@tanstack/react-query"
import { Command as CommandPrimitive } from "cmdk"
import { ChevronDownIcon } from "lucide-react"
import { useState } from "react"
import { cn } from "cn"

import { Button } from "@components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { Skeleton } from "@components/ui/skeleton"

import { siteStatsQueryOptions, type StatsRange } from "./api"
import { DimensionIcon, dimensionLabel } from "./dimension-icon"
import type { Breakdown } from "./panels"
import {
  dependentFilters,
  type FilterKey,
  type SiteSearch,
} from "./search"
import { useSiteSearch } from "./use-site-search"

type FilterOption = {
  filterKey: FilterKey
  breakdown: Breakdown
  label: string
}

type FilterCategory = {
  id: string
  label: string
  options: FilterOption[]
}

const filterCategories: FilterCategory[] = [
  {
    id: "page",
    label: "Page",
    options: [{ filterKey: "path", breakdown: "path", label: "Path" }],
  },
  {
    id: "source",
    label: "Source",
    options: [
      { filterKey: "source", breakdown: "source", label: "Channel" },
      { filterKey: "referrer", breakdown: "referrer", label: "Referrer" },
      {
        filterKey: "referrer_path",
        breakdown: "referrer_path",
        label: "Referrer path",
      },
    ],
  },
  {
    id: "utm",
    label: "UTM tags",
    options: [
      { filterKey: "utm_source", breakdown: "utm_source", label: "UTM source" },
      { filterKey: "utm_medium", breakdown: "utm_medium", label: "UTM medium" },
      {
        filterKey: "utm_campaign",
        breakdown: "utm_campaign",
        label: "UTM campaign",
      },
      {
        filterKey: "utm_content",
        breakdown: "utm_content",
        label: "UTM content",
      },
      { filterKey: "utm_term", breakdown: "utm_term", label: "UTM term" },
    ],
  },
  {
    id: "location",
    label: "Location",
    options: [
      { filterKey: "country", breakdown: "country", label: "Country" },
      { filterKey: "city", breakdown: "city", label: "City" },
    ],
  },
  {
    id: "screen",
    label: "Screen size",
    options: [
      { filterKey: "screen", breakdown: "screen", label: "Screen" },
      { filterKey: "device", breakdown: "device", label: "Device" },
    ],
  },
  {
    id: "browser",
    label: "Browser",
    options: [
      { filterKey: "browser", breakdown: "browser", label: "Browser" },
    ],
  },
  {
    id: "os",
    label: "Operating system",
    options: [{ filterKey: "os", breakdown: "os", label: "OS" }],
  },
  {
    id: "event",
    label: "Event",
    options: [
      { filterKey: "event", breakdown: "event", label: "Event name" },
    ],
  },
  {
    id: "property",
    label: "Property",
    options: [
      { filterKey: "prop", breakdown: "prop_key", label: "Property" },
      {
        filterKey: "prop_value",
        breakdown: "prop_value",
        label: "Property value",
      },
    ],
  },
]

export function FilterMenu({
  search,
  range,
  patchSearch,
}: {
  search: SiteSearch
  range: StatsRange
  patchSearch: (patch: Partial<SiteSearch>) => void
}) {
  const { slug, siteId, filters, includeBots } = useSiteSearch()
  const [open, setOpen] = useState(false)
  const activeCount = Object.keys(filters).length

  function apply(key: FilterKey, value: string) {
    patchSearch({
      ...dependentFilters(key),
      [key]: value,
    })
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={activeCount > 0 ? "secondary" : "outline"}
          size="xs"
          className="gap-1.5"
        >
          Filter
          {activeCount > 0 ? (
            <span className="font-mono tabular-nums">{activeCount}</span>
          ) : null}
          <ChevronDownIcon
            data-icon="inline-end"
            className={cn(
              "opacity-60 transition-transform",
              open && "rotate-180"
            )}
          />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {filterCategories.map((category) => {
          const only = category.options[0]
          if (category.options.length === 1 && only) {
            return (
              <DropdownMenuSub key={category.id}>
                <DropdownMenuSubTrigger>
                  {category.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-64 p-0">
                  <FilterValueCommand
                    slug={slug}
                    siteId={siteId}
                    range={range}
                    filters={filters}
                    includeBots={includeBots}
                    option={only}
                    selected={search[only.filterKey]}
                    onSelect={(value) => apply(only.filterKey, value)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          }
          return (
            <DropdownMenuSub key={category.id}>
              <DropdownMenuSubTrigger>
                {category.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-40 p-1">
                {category.options.map((option) => (
                  <DropdownMenuSub key={option.filterKey}>
                    <DropdownMenuSubTrigger>
                      {option.label}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-64 p-0">
                      <FilterValueCommand
                        slug={slug}
                        siteId={siteId}
                        range={range}
                        filters={filters}
                        includeBots={includeBots}
                        option={option}
                        selected={search[option.filterKey]}
                        onSelect={(value) => apply(option.filterKey, value)}
                      />
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterValueCommand({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  option,
  selected,
  onSelect,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: Partial<Record<FilterKey, string>>
  includeBots: boolean
  option: FilterOption
  selected: string | undefined
  onSelect: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const { data, isPending } = useQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      option.breakdown,
      range,
      filters,
      includeBots
    )
  )
  const rows = (data?.points ?? []).map((point) => ({
    value: point.series,
    visitors: point.visitors,
  }))
  const trimmed = query.trim()
  const hasExact = rows.some((row) => row.value === trimmed)
  const allowCustom =
    trimmed.length > 0 &&
    !hasExact &&
    (option.filterKey === "path" ||
      option.filterKey === "referrer" ||
      option.filterKey === "referrer_path" ||
      option.filterKey === "event" ||
      option.filterKey === "prop" ||
      option.filterKey === "prop_value" ||
      option.filterKey.startsWith("utm_"))

  return (
    <Command shouldFilter>
      <div className="p-1 pb-0">
        <CommandPrimitive.Input
          value={query}
          onValueChange={setQuery}
          autoFocus
          placeholder={`Filter ${option.label.toLowerCase()}…`}
          className="h-7 w-full rounded-md border border-input/30 bg-input/30 px-2 text-xs outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <CommandList>
        {isPending ? (
          <div className="space-y-1.5 p-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (
          <>
            <CommandEmpty>No matching values.</CommandEmpty>
            <CommandGroup>
              {allowCustom ? (
                <CommandItem
                  value={`custom:${trimmed}`}
                  onSelect={() => onSelect(trimmed)}
                >
                  Use “{trimmed}”
                </CommandItem>
              ) : null}
              {rows.map((row) => {
                const label = dimensionLabel(option.breakdown, row.value)
                return (
                  <CommandItem
                    key={row.value || "(none)"}
                    value={`${label} ${row.value}`}
                    data-checked={selected === row.value ? true : undefined}
                    onSelect={() => onSelect(row.value)}
                  >
                    <DimensionIcon
                      dimension={option.breakdown}
                      value={row.value}
                    />
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {row.visitors.toLocaleString()}
                    </span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </Command>
  )
}

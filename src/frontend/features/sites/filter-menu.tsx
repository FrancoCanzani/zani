import { useQuery } from "@tanstack/react-query"
import {
  AppWindowIcon,
  CrosshairIcon,
  FilterIcon,
  GlobeIcon,
  LaptopIcon,
  LinkIcon,
  MapPinIcon,
  MonitorIcon,
  TagIcon,
  WavesIcon,
} from "lucide-react"
import { useState } from "react"

import { Button } from "@components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
  filterLabels,
  type FilterKey,
  type SiteSearch,
} from "./search"
import { useSiteSearch } from "./use-site-search"

type FilterOption = {
  filterKey: FilterKey
  breakdown: Breakdown
  label: string
  description: string
}

type FilterCategory = {
  id: string
  label: string
  icon: typeof FilterIcon
  options: FilterOption[]
}

const filterCategories: FilterCategory[] = [
  {
    id: "page",
    label: "Page",
    icon: LinkIcon,
    options: [
      {
        filterKey: "path",
        breakdown: "path",
        label: "Path",
        description: "Filter by page path",
      },
    ],
  },
  {
    id: "source",
    label: "Source",
    icon: WavesIcon,
    options: [
      {
        filterKey: "source",
        breakdown: "source",
        label: "Channel",
        description: "Direct, search, referral, and more",
      },
      {
        filterKey: "referrer",
        breakdown: "referrer",
        label: "Referrer",
        description: "Referring site host",
      },
      {
        filterKey: "referrer_path",
        breakdown: "referrer_path",
        label: "Referrer path",
        description: "Path on the referring site",
      },
    ],
  },
  {
    id: "utm",
    label: "UTM tags",
    icon: CrosshairIcon,
    options: [
      {
        filterKey: "utm_source",
        breakdown: "utm_source",
        label: "UTM source",
        description: "utm_source parameter",
      },
      {
        filterKey: "utm_medium",
        breakdown: "utm_medium",
        label: "UTM medium",
        description: "utm_medium parameter",
      },
      {
        filterKey: "utm_campaign",
        breakdown: "utm_campaign",
        label: "UTM campaign",
        description: "utm_campaign parameter",
      },
      {
        filterKey: "utm_content",
        breakdown: "utm_content",
        label: "UTM content",
        description: "utm_content parameter",
      },
      {
        filterKey: "utm_term",
        breakdown: "utm_term",
        label: "UTM term",
        description: "utm_term parameter",
      },
    ],
  },
  {
    id: "location",
    label: "Location",
    icon: MapPinIcon,
    options: [
      {
        filterKey: "country",
        breakdown: "country",
        label: "Country",
        description: "Visitor country",
      },
      {
        filterKey: "city",
        breakdown: "city",
        label: "City",
        description: "Visitor city",
      },
    ],
  },
  {
    id: "screen",
    label: "Screen size",
    icon: MonitorIcon,
    options: [
      {
        filterKey: "screen",
        breakdown: "screen",
        label: "Screen",
        description: "Viewport width bucket",
      },
      {
        filterKey: "device",
        breakdown: "device",
        label: "Device",
        description: "Desktop, mobile, or tablet",
      },
    ],
  },
  {
    id: "browser",
    label: "Browser",
    icon: AppWindowIcon,
    options: [
      {
        filterKey: "browser",
        breakdown: "browser",
        label: "Browser",
        description: "Chrome, Safari, Firefox, and more",
      },
    ],
  },
  {
    id: "os",
    label: "Operating system",
    icon: LaptopIcon,
    options: [
      {
        filterKey: "os",
        breakdown: "os",
        label: "OS",
        description: "macOS, Windows, iOS, Android",
      },
    ],
  },
  {
    id: "event",
    label: "Event",
    icon: GlobeIcon,
    options: [
      {
        filterKey: "event",
        breakdown: "event",
        label: "Event name",
        description: "Custom event name",
      },
    ],
  },
  {
    id: "property",
    label: "Property",
    icon: TagIcon,
    options: [
      {
        filterKey: "prop",
        breakdown: "prop_key",
        label: "Property",
        description: "Custom event property key",
      },
      {
        filterKey: "prop_value",
        breakdown: "prop_value",
        label: "Property value",
        description: "Value for the selected property",
      },
    ],
  },
]

type Picker = {
  filterKey: FilterKey
  breakdown: Breakdown
  label: string
}

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
  const [picker, setPicker] = useState<Picker | null>(null)
  const activeCount = Object.keys(filters).length

  function openPicker(option: FilterOption) {
    if (option.filterKey === "prop_value" && search.prop === undefined) {
      setPicker({
        filterKey: "prop",
        breakdown: "prop_key",
        label: "Property",
      })
      return
    }
    if (option.filterKey === "prop" && search.event === undefined) {
      setPicker({
        filterKey: "event",
        breakdown: "event",
        label: "Event name",
      })
      return
    }
    setPicker({
      filterKey: option.filterKey,
      breakdown: option.breakdown,
      label: option.label,
    })
  }

  function applyValue(value: string) {
    if (!picker) return
    const key = picker.filterKey
    patchSearch({
      ...dependentFilters(key),
      [key]: value,
    })
    if (key === "prop") {
      setPicker({
        filterKey: "prop_value",
        breakdown: "prop_value",
        label: "Property value",
      })
      return
    }
    setPicker(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            size="xs"
            variant={activeCount > 0 ? "secondary" : "outline"}
          >
            <FilterIcon data-icon="inline-start" />
            Filter
            {activeCount > 0 ? (
              <span className="font-mono tabular-nums">{activeCount}</span>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {filterCategories.map((category) => {
            const Icon = category.icon
            const only = category.options[0]
            if (category.options.length === 1 && only) {
              return (
                <DropdownMenuItem
                  key={category.id}
                  onSelect={() => openPicker(only)}
                >
                  <Icon />
                  {category.label}
                </DropdownMenuItem>
              )
            }
            return (
              <DropdownMenuSub key={category.id}>
                <DropdownMenuSubTrigger>
                  <Icon />
                  {category.label}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-56">
                  {category.options.map((option) => (
                    <DropdownMenuItem
                      key={option.filterKey}
                      onSelect={() => openPicker(option)}
                      className="items-start py-2"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate">{option.label}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={picker !== null}
        onOpenChange={(open) => {
          if (!open) setPicker(null)
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="top-[20%] translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-md"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {picker ? `Filter by ${picker.label}` : "Filter"}
            </DialogTitle>
            <DialogDescription>
              Choose a value to filter the dashboard.
            </DialogDescription>
          </DialogHeader>
          {picker ? (
            <FilterValuePicker
              slug={slug}
              siteId={siteId}
              range={range}
              filters={filters}
              includeBots={includeBots}
              picker={picker}
              selected={search[picker.filterKey]}
              onSelect={applyValue}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FilterValuePicker({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  picker,
  selected,
  onSelect,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: Partial<Record<FilterKey, string>>
  includeBots: boolean
  picker: Picker
  selected: string | undefined
  onSelect: (value: string) => void
}) {
  const [query, setQuery] = useState("")
  const { data, isPending } = useQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      picker.breakdown,
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
    (picker.filterKey === "path" ||
      picker.filterKey === "referrer" ||
      picker.filterKey === "referrer_path" ||
      picker.filterKey === "event" ||
      picker.filterKey === "prop" ||
      picker.filterKey === "prop_value" ||
      picker.filterKey.startsWith("utm_"))

  return (
    <Command shouldFilter>
      <div className="border-b border-border/60 px-3 py-2.5">
        <p className="text-sm font-medium">{filterLabels[picker.filterKey]}</p>
        <p className="text-xs text-muted-foreground">
          Values from the current range
        </p>
      </div>
      <CommandInput
        placeholder={`Search ${picker.label.toLowerCase()}…`}
        value={query}
        onValueChange={setQuery}
      />
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
                const label = dimensionLabel(picker.breakdown, row.value)
                return (
                  <CommandItem
                    key={row.value || "(none)"}
                    value={`${label} ${row.value}`}
                    data-checked={selected === row.value ? true : undefined}
                    onSelect={() => onSelect(row.value)}
                  >
                    <DimensionIcon
                      dimension={picker.breakdown}
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

import {
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Suspense, useMemo, useState } from "react"

import { Segmented } from "@components/segmented"
import { Button } from "@components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@components/ui/sheet"
import { Skeleton } from "@components/ui/skeleton"

import {
  siteStatsQueryOptions,
  type StatsFilters,
  type StatsRange,
} from "./api"
import { CountriesMap } from "./countries-map"
import { DimensionIcon, dimensionLabel } from "./dimension-icon"
import {
  breakdownKey,
  panelTabsForSearch,
  type Breakdown,
  type BreakdownPanelConfig,
  type BreakdownTab,
} from "./panels"
import type { FilterKey, SiteSearch } from "./search"

const visibleRows = 8

type Row = {
  value: string
  visitors: number
}

function RowList({
  dimension,
  filterKey,
  rows,
  activeValue,
  onSelect,
}: {
  dimension: Breakdown
  filterKey: FilterKey
  rows: Row[]
  activeValue: string | undefined
  onSelect: (key: FilterKey, value: string) => void
}) {
  const max = Math.max(1, ...rows.map((row) => row.visitors))

  return (
    <div>
      <div className="mt-3 mb-1 flex h-6 items-center gap-3 border-b border-border/60 px-2 pb-1 text-xs text-muted-foreground">
        <span className="flex-1" />
        <span className="w-20 text-right">Visitors</span>
      </div>
      <ul className="space-y-0.5">
        {rows.map((row) => {
          const selected = activeValue === row.value
          return (
            <li key={row.value || "(none)"}>
              <button
                type="button"
                onClick={() => onSelect(filterKey, row.value)}
                className={`group relative flex h-[30px] w-full items-center gap-3 overflow-hidden rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? "bg-muted/70" : ""}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 rounded-md bg-foreground/[0.06] transition-[width]"
                  style={{ width: `${(row.visitors / max) * 100}%` }}
                />
                <span className="relative flex min-w-0 flex-1 items-center gap-2">
                  <DimensionIcon dimension={dimension} value={row.value} />
                  <span
                    className={`truncate ${row.value ? "" : "text-muted-foreground"} ${dimension === "country" || dimension === "source" || dimension === "device" ? "" : "font-mono"}`}
                  >
                    {dimensionLabel(dimension, row.value)}
                  </span>
                </span>
                <span className="relative w-20 text-right font-mono text-muted-foreground tabular-nums">
                  {row.visitors.toLocaleString()}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function BreakdownBodyFallback() {
  return (
    <div className="space-y-1.5 pt-6">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton
          key={index}
          className="h-[26px] rounded-md"
          style={{ width: `${92 - index * 12}%` }}
        />
      ))}
    </div>
  )
}

function BreakdownBody({
  title,
  tab,
  slug,
  siteId,
  range,
  filters,
  includeBots,
  search,
  onSelect,
}: {
  title: string
  tab: BreakdownTab
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  search: SiteSearch
  onSelect: (key: FilterKey, value: string) => void
}) {
  const dataKey = breakdownKey(tab)
  const { data } = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, dataKey, range, filters, includeBots)
  )

  const rows = useMemo(
    () =>
      data.points
        .map((point) => ({
          value: point.series,
          visitors: point.visitors,
        }))
        .sort((a, b) => b.visitors - a.visitors),
    [data.points]
  )

  if (tab.view === "map") {
    return (
      <CountriesMap
        points={rows.map((row) => ({
          series: row.value,
          value: row.visitors,
        }))}
        valueLabel="visitors"
        activeValue={search.country}
        onSelect={(country) => onSelect("country", country)}
      />
    )
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-xs text-muted-foreground">
        No data in this range
      </p>
    )
  }

  const listProps = {
    dimension: dataKey,
    filterKey: tab.filterKey,
    activeValue: search[tab.filterKey],
  }

  return (
    <div className="space-y-1">
      <RowList
        {...listProps}
        rows={rows.slice(0, visibleRows)}
        onSelect={onSelect}
      />
      {rows.length > visibleRows ? (
        <Sheet>
          <SheetTrigger asChild>
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              View all {rows.length.toLocaleString()}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>
                {title} · {tab.label}
              </SheetTitle>
              <SheetDescription>
                Visitors in the selected range.
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-6">
              <RowList {...listProps} rows={rows} onSelect={onSelect} />
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
      {data.truncated ? (
        <p className="px-2 text-xs text-muted-foreground">
          Showing the top {data.points.length}.
        </p>
      ) : null}
    </div>
  )
}

export function BreakdownPanel({
  panel,
  slug,
  siteId,
  range,
  filters,
  includeBots,
  search,
  onSelect,
}: {
  panel: BreakdownPanelConfig
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  search: SiteSearch
  onSelect: (key: FilterKey, value: string) => void
}) {
  const queryClient = useQueryClient()
  const tabs = panelTabsForSearch(panel, search)
  const [active, setActive] = useState(tabs[0]!.key)
  const tab = tabs.find((item) => item.key === active) ?? tabs[0]!
  const dataKey = breakdownKey(tab)
  const showTabs = tabs.length > 1
  const tabLabels = Object.fromEntries(
    tabs.map((item) => [item.key, item.label])
  ) as Record<BreakdownTab["key"], string>
  const title =
    panel.id === "sources" && search.referrer !== undefined
      ? `Sources · ${search.referrer || "(none)"}`
      : panel.id === "events" && search.event !== undefined
        ? search.prop !== undefined
          ? `Events · ${search.event} · ${search.prop}`
          : `Events · ${search.event}`
        : panel.title

  function prefetch(breakdown: Breakdown) {
    void queryClient.prefetchQuery(
      siteStatsQueryOptions(
        slug,
        siteId,
        breakdown,
        range,
        filters,
        includeBots
      )
    )
  }

  return (
    <section className="flex min-w-0 flex-col rounded-xl border border-border/70 bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-medium tracking-tight">{title}</h2>
        {showTabs ? (
          <Segmented
            label={`${title} breakdown`}
            options={tabs.map((item) => item.key)}
            value={tab.key}
            labels={tabLabels}
            onChange={setActive}
            onHover={(key) => {
              const item = tabs.find((candidate) => candidate.key === key)
              if (item) prefetch(breakdownKey(item))
            }}
          />
        ) : null}
      </div>
      <Suspense fallback={<BreakdownBodyFallback />}>
        <BreakdownBody
          key={dataKey}
          title={title}
          tab={tab}
          slug={slug}
          siteId={siteId}
          range={range}
          filters={filters}
          includeBots={includeBots}
          search={search}
          onSelect={onSelect}
        />
      </Suspense>
    </section>
  )
}

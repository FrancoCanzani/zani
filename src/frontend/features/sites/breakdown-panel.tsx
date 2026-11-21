import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Suspense, useEffect, useState } from "react"

import {
  siteStatsQueryOptions,
  statsQueryFromSearch,
  type SiteStats,
  type StatsFilters,
  type StatsRange,
} from "./api"
import { CountriesMap } from "./countries-map"
import { breakdownKey, type Breakdown, type BreakdownTab } from "./panels"
import type { FilterKey, SiteSearch } from "./search"

function BreakdownTable({
  filterKey,
  data,
  activeValue,
  onSelect,
}: {
  filterKey: FilterKey
  data: SiteStats
  activeValue: string | undefined
  onSelect: (key: FilterKey, value: string) => void
}) {
  const maxViews = Math.max(1, ...data.points.map((point) => point.views))
  const totalViews = data.points.reduce((sum, point) => sum + point.views, 0)

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1.5">
        {data.points.length === 0 ? (
          <li className="py-2 text-xs text-muted-foreground">No data</li>
        ) : (
          data.points.map((point) => {
            const value = point.series
            const selected = activeValue === value
            const share = totalViews === 0 ? 0 : point.views / totalViews
            return (
              <li key={value || "(none)"}>
                <button
                  type="button"
                  onClick={() => onSelect(filterKey, value)}
                  className={`relative flex h-[30px] w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted/60 ${selected ? "bg-muted/60" : ""}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-foreground/[0.06]"
                    style={{ width: `${(point.views / maxViews) * 100}%` }}
                  />
                  <span className="relative min-w-0 flex-1 truncate font-mono">
                    {value || "(none)"}
                  </span>
                  <span className="relative font-mono text-[13px] text-muted-foreground tabular-nums">
                    {point.views}
                  </span>
                  <span className="relative w-8 text-right font-mono text-[13px] text-muted-foreground tabular-nums">
                    {Math.round(share * 100)}%
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
      {data.truncated ? (
        <p className="text-xs text-muted-foreground">Truncated.</p>
      ) : null}
    </div>
  )
}

function BreakdownBodyFallback() {
  return <p className="py-2 text-xs text-muted-foreground">Loading…</p>
}

function BreakdownBody({
  tab,
  slug,
  siteId,
  range,
  filters,
  includeBots,
  search,
  onSelect,
}: {
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

  if (tab.view === "map") {
    return (
      <CountriesMap
        points={data.points}
        activeValue={search.country}
        onSelect={(country) => onSelect("country", country)}
      />
    )
  }

  return (
    <BreakdownTable
      filterKey={tab.filterKey}
      data={data}
      activeValue={search[tab.filterKey]}
      onSelect={onSelect}
    />
  )
}

export function BreakdownPanel({
  title,
  tabs,
  slug,
  siteId,
  range,
  filters,
  includeBots,
  search,
  onSelect,
}: {
  title: string
  tabs: BreakdownTab[]
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  search: SiteSearch
  onSelect: (key: FilterKey, value: string) => void
}) {
  const queryClient = useQueryClient()
  const [active, setActive] = useState(tabs[0]!.key)
  const tab = tabs.find((item) => item.key === active) ?? tabs[0]!
  const dataKey = breakdownKey(tab)
  const showTabs = tabs.length > 1

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

  useEffect(() => {
    const {
      range: idleRange,
      filters: idleFilters,
      includeBots: idleBots,
    } = statsQueryFromSearch(search)
    const handle = window.setTimeout(() => {
      for (const item of tabs) {
        const key = breakdownKey(item)
        if (key === dataKey) continue
        void queryClient.prefetchQuery(
          siteStatsQueryOptions(
            slug,
            siteId,
            key,
            idleRange,
            idleFilters,
            idleBots
          )
        )
      }
    }, 150)
    return () => window.clearTimeout(handle)
  }, [slug, siteId, search, dataKey, queryClient, tabs])

  return (
    <section className="rounded-lg border border-border/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {showTabs ? (
          <div
            role="radiogroup"
            aria-label={`${title} breakdown`}
            className="flex h-[26px] items-center gap-0.5 rounded-[7px] bg-muted p-0.5"
          >
            {tabs.map((item) => {
              const selected = item.key === active
              return (
                <button
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onMouseEnter={() => prefetch(breakdownKey(item))}
                  onFocus={() => prefetch(breakdownKey(item))}
                  onClick={() => setActive(item.key)}
                  className={`h-[22px] shrink-0 rounded-[5px] px-2 text-[12px] leading-4 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                    selected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      <Suspense fallback={<BreakdownBodyFallback />}>
        <BreakdownBody
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

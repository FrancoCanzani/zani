import {
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { ArrowDownIcon } from "lucide-react"
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
  formatCompactMoney,
  formatMoney,
  revenueBreakdownQueryOptions,
} from "@features/revenue/api"

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

const revenueBreakdowns = new Set<Breakdown>([
  "source",
  "referrer",
  "path",
  "entry",
  "country",
  "device",
  "utm_medium",
  "utm_campaign",
])

const visibleRows = 8

type SortKey = "visitors" | "revenue" | "conversions"

type Row = {
  value: string
  visitors: number
  conversions: number
  customers: number
  newMrr: number
}

type RevenueContext = {
  enabled: boolean
  currency: string
}

function ColumnHeader({
  label,
  active,
  onClick,
  className,
}: {
  label: string
  active: boolean
  onClick?: () => void
  className: string
}) {
  if (!onClick) {
    return <span className={className}>{label}</span>
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`${className} inline-flex items-center justify-end gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${active ? "text-foreground" : ""}`}
    >
      <ArrowDownIcon
        aria-hidden
        className={`size-3 transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
      />
      {label}
    </button>
  )
}

function conversionRate(conversions: number, visitors: number) {
  if (visitors <= 0) return "—"
  const value = (conversions / visitors) * 100
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
}

function RowList({
  dimension,
  filterKey,
  rows,
  activeValue,
  showRevenue,
  showConversions,
  sort,
  currency,
  onSort,
  onSelect,
}: {
  dimension: Breakdown
  filterKey: FilterKey
  rows: Row[]
  activeValue: string | undefined
  showRevenue: boolean
  showConversions: boolean
  sort: SortKey
  currency: string
  onSort?: (sort: SortKey) => void
  onSelect: (key: FilterKey, value: string) => void
}) {
  const metricOf = (row: Row) => {
    switch (sort) {
      case "revenue":
        return row.newMrr
      case "conversions":
        return row.conversions
      case "visitors":
        return row.visitors
      default: {
        const exhaustive: never = sort
        return exhaustive
      }
    }
  }
  const max = Math.max(1, ...rows.map(metricOf))
  const sortable = showRevenue || showConversions

  return (
    <div>
      <div className="mt-3 mb-1 flex h-6 items-center gap-3 border-b border-border/60 px-2 pb-1 text-xs text-muted-foreground">
        <span className="flex-1" />
        <ColumnHeader
          label="Visitors"
          active={sortable && sort === "visitors"}
          onClick={sortable && onSort ? () => onSort("visitors") : undefined}
          className="w-20 text-right"
        />
        {showConversions ? (
          <>
            <ColumnHeader
              label="Conv."
              active={sort === "conversions"}
              onClick={onSort ? () => onSort("conversions") : undefined}
              className="w-14 text-right"
            />
            <span className="w-12 text-right">CR</span>
          </>
        ) : null}
        {showRevenue ? (
          <ColumnHeader
            label="Revenue"
            active={sort === "revenue"}
            onClick={onSort ? () => onSort("revenue") : undefined}
            className="w-24 text-right"
          />
        ) : null}
      </div>
      <ul className="space-y-0.5">
        {rows.map((row) => {
          const selected = activeValue === row.value
          const perVisitor =
            row.visitors > 0 && row.newMrr > 0
              ? `${formatMoney(Math.round(row.newMrr / row.visitors), currency)} per visitor · ${row.customers} ${row.customers === 1 ? "customer" : "customers"}`
              : undefined
          return (
            <li key={row.value || "(none)"}>
              <button
                type="button"
                title={perVisitor}
                onClick={() => onSelect(filterKey, row.value)}
                className={`group relative flex h-[30px] w-full items-center gap-3 overflow-hidden rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? "bg-muted/70" : ""}`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 rounded-md transition-[width] ${sort === "revenue" ? "bg-emerald-500/10" : "bg-foreground/[0.06]"}`}
                  style={{ width: `${(metricOf(row) / max) * 100}%` }}
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
                {showConversions ? (
                  <>
                    <span className="relative w-14 text-right font-mono tabular-nums">
                      {row.conversions.toLocaleString()}
                    </span>
                    <span className="relative w-12 text-right font-mono text-muted-foreground tabular-nums">
                      {conversionRate(row.conversions, row.visitors)}
                    </span>
                  </>
                ) : null}
                {showRevenue ? (
                  <span
                    className={`relative w-24 text-right font-mono tabular-nums ${row.newMrr > 0 ? "text-foreground" : "text-muted-foreground/60"}`}
                  >
                    {row.newMrr > 0
                      ? formatCompactMoney(row.newMrr, currency)
                      : "—"}
                  </span>
                ) : null}
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
  goal,
  search,
  revenue,
  onSelect,
}: {
  title: string
  tab: BreakdownTab
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  goal: string | undefined
  search: SiteSearch
  revenue: RevenueContext
  onSelect: (key: FilterKey, value: string) => void
}) {
  const dataKey = breakdownKey(tab)
  const [sort, setSort] = useState<SortKey>("visitors")
  const { data } = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      dataKey,
      range,
      filters,
      includeBots,
      goal
    )
  )
  const revenueSupported = revenue.enabled && revenueBreakdowns.has(dataKey)
  const revenueData = useQuery({
    ...revenueBreakdownQueryOptions(slug, siteId, dataKey, range, filters),
    enabled: revenueSupported,
  })

  const rows = useMemo(() => {
    const merged = new Map<string, Row>()
    for (const point of data.points) {
      merged.set(point.series, {
        value: point.series,
        visitors: point.visitors,
        conversions: point.conversions,
        customers: 0,
        newMrr: 0,
      })
    }
    if (revenueSupported) {
      for (const row of revenueData.data?.rows ?? []) {
        if (row.newMrr === 0 && !merged.has(row.key)) continue
        const target = merged.get(row.key) ?? {
          value: row.key,
          visitors: 0,
          conversions: 0,
          customers: 0,
          newMrr: 0,
        }
        target.customers += row.customers
        target.newMrr += row.newMrr
        merged.set(row.key, target)
      }
    }
    const list = [...merged.values()]
    switch (sort) {
      case "revenue":
        return list.sort(
          (a, b) => b.newMrr - a.newMrr || b.visitors - a.visitors
        )
      case "conversions":
        return list.sort(
          (a, b) => b.conversions - a.conversions || b.visitors - a.visitors
        )
      case "visitors":
        return list.sort(
          (a, b) => b.visitors - a.visitors || b.newMrr - a.newMrr
        )
      default: {
        const exhaustive: never = sort
        return exhaustive
      }
    }
  }, [data.points, revenueData.data, revenueSupported, sort])

  const showRevenue = revenueSupported && rows.some((row) => row.newMrr > 0)
  const showConversions = Boolean(goal)
  const currency = revenueData.data?.currency ?? revenue.currency

  if (tab.view === "map") {
    return (
      <CountriesMap
        points={rows.map((row) => ({
          series: row.value,
          value: showConversions ? row.conversions : row.visitors,
          weight: row.newMrr,
          detail:
            row.newMrr > 0
              ? `${formatMoney(row.newMrr, currency)} new MRR · ${row.customers} ${row.customers === 1 ? "customer" : "customers"}`
              : showConversions
                ? `${row.conversions.toLocaleString()} conversions · ${conversionRate(row.conversions, row.visitors)} CR`
                : undefined,
        }))}
        valueLabel={showConversions ? "conversions" : "visitors"}
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
    showRevenue,
    showConversions,
    sort:
      showRevenue || showConversions ? sort : ("visitors" as const),
    currency,
    onSort: setSort,
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
                {showConversions
                  ? "Visitors and conversions for the selected goal."
                  : showRevenue
                    ? "Visitors and new MRR from customers whose first visit matched."
                    : "Visitors in the selected range."}
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
  revenue,
  onSelect,
}: {
  panel: BreakdownPanelConfig
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  search: SiteSearch
  revenue: RevenueContext
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
        includeBots,
        search.goal
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
          goal={search.goal}
          search={search}
          revenue={revenue}
          onSelect={onSelect}
        />
      </Suspense>
    </section>
  )
}

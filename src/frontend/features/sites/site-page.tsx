import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

import { Skeleton } from "@components/ui/skeleton"
import { revenueOverviewQueryOptions } from "@features/revenue/api"

import { previousStatsRange, siteStatsQueryOptions } from "./api"
import { BreakdownPanel } from "./breakdown-panel"
import { DashboardChart } from "./dashboard-chart"
import { KpiCards } from "./kpi-cards"
import { LiveDashboard } from "./live-dashboard"
import { breakdownPanels } from "./panels"
import { chartSeriesFor, filterLabels } from "./search"
import { useSiteSearch } from "./use-site-search"

export function SitePage() {
  const { search } = useSiteSearch()
  if (!search.live) return <Dashboard />
  return (
    <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
      <LiveDashboard />
    </Suspense>
  )
}

function Dashboard() {
  const {
    slug,
    siteId,
    search,
    range,
    filters,
    includeBots,
    timeZone,
    patchSearch,
    toggleFilter,
  } = useSiteSearch()
  const previousRange = previousStatsRange(range)
  const { data: totals } = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters, includeBots)
  )
  const { data: revenue } = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, range, filters)
  )
  const previousTotals = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      undefined,
      previousRange,
      filters,
      includeBots
    )
  )
  const previousRevenue = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, previousRange, filters)
  )
  const { bars, line } = chartSeriesFor(search.metric)
  const revenueContext = {
    enabled: revenue.hasData,
    currency: revenue.currency,
  }

  return (
    <>
      <KpiCards
        totals={totals}
        previousTotals={previousTotals.data}
        revenue={revenue}
        previousRevenue={previousRevenue.data}
        selected={search.metric}
        onSelect={(metric) => patchSearch({ metric })}
      />

      {revenue.hasData && revenue.ignoredFilters.length > 0 ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          Revenue ignores the{" "}
          {revenue.ignoredFilters
            .map((key) => filterLabels[key].toLowerCase())
            .join(", ")}{" "}
          filter. Signups only record channel, landing page, country, and
          device.
        </p>
      ) : null}

      <DashboardChart
        points={totals.points}
        previousPoints={previousTotals.data.points}
        revenuePoints={revenue.points}
        range={range}
        bars={bars}
        line={line}
        currency={revenue.currency}
        showRevenue={revenue.hasData}
        compare={search.compare}
        timeZone={timeZone}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {breakdownPanels.map((panel) => (
          <BreakdownPanel
            key={panel.id}
            panel={panel}
            slug={slug}
            siteId={siteId}
            range={range}
            filters={filters}
            includeBots={includeBots}
            search={search}
            revenue={revenueContext}
            onSelect={toggleFilter}
          />
        ))}
      </div>
    </>
  )
}

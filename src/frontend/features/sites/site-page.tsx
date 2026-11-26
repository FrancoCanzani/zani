import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

import { Skeleton } from "@components/ui/skeleton"

import { previousStatsRange, siteStatsQueryOptions } from "./api"
import { BreakdownPanel } from "./breakdown-panel"
import { DashboardChart } from "./dashboard-chart"
import { KpiCards } from "./kpi-cards"
import { LiveDashboard } from "./live-dashboard"
import { breakdownPanels } from "./panels"
import { trafficMetricFromSearch } from "./search"
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
  const metric = trafficMetricFromSearch(search.metric)
  const chartMetric = metric === "bounce" ? "visitors" : metric

  return (
    <>
      <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <KpiCards
          totals={totals}
          previousTotals={previousTotals.data}
          selected={metric}
          onSelect={(next) => patchSearch({ metric: next })}
        />
        <div className="px-3 pt-1 pb-3 sm:px-4">
          <DashboardChart
            points={totals.points}
            previousPoints={previousTotals.data.points}
            range={range}
            metric={chartMetric}
            compare={search.compare}
            timeZone={timeZone}
            framed={false}
          />
        </div>
      </section>

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
            onSelect={toggleFilter}
          />
        ))}
      </div>
    </>
  )
}

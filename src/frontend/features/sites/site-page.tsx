import { useSuspenseQuery } from "@tanstack/react-query"
import { Suspense } from "react"

import { Skeleton } from "@components/ui/skeleton"
import { revenueOverviewQueryOptions } from "@features/revenue/api"

import { previousStatsRange, siteStatsQueryOptions } from "./api"
import { BreakdownPanel } from "./breakdown-panel"
import { DashboardChart } from "./dashboard-chart"
import { FunnelsPanel, FunnelsPanelFallback } from "./funnels-panel"
import { GoalsPanel, GoalsPanelFallback } from "./goals-panel"
import { KpiCards } from "./kpi-cards"
import { LiveDashboard } from "./live-dashboard"
import { breakdownPanels } from "./panels"
import { chartSeriesFor, filterLabels } from "./search"
import { SetupChecklist } from "./setup-checklist"
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
    goal,
    timeZone,
    patchSearch,
    toggleFilter,
  } = useSiteSearch()
  const previousRange = previousStatsRange(range)
  const { data: totals } = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      undefined,
      range,
      filters,
      includeBots,
      goal
    )
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
      includeBots,
      goal
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
      <SetupChecklist
        slug={slug}
        siteId={siteId}
        stripeConnected={revenue.connected}
      />

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
        <Suspense fallback={<GoalsPanelFallback />}>
          <GoalsPanel
            slug={slug}
            siteId={siteId}
            range={range}
            filters={filters}
            includeBots={includeBots}
            activeGoal={search.goal}
            onSelect={(next) => patchSearch({ goal: next })}
          />
        </Suspense>
        <Suspense fallback={<FunnelsPanelFallback />}>
          <FunnelsPanel
            slug={slug}
            siteId={siteId}
            range={range}
            filters={filters}
            includeBots={includeBots}
            activeFunnel={search.funnel}
            onSelect={(next) => patchSearch({ funnel: next })}
          />
        </Suspense>
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

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Suspense } from "react"

import { Button } from "@components/ui/button"
import { Skeleton } from "@components/ui/skeleton"
import { previousStatsRange } from "@features/sites/api"
import { filterLabels, revenueChartMetricFromSearch } from "@features/sites/search"
import { useSiteSearch } from "@features/sites/use-site-search"

import { revenueOverviewQueryOptions } from "./api"
import { RevenueChart } from "./revenue-chart"
import { RevenueKpiCards } from "./revenue-kpi-cards"
import { MovementsPanel, TopCustomersPanel } from "./revenue-panels"

export function RevenuePage() {
  const { slug, siteId, search, range, filters, timeZone, patchSearch } =
    useSiteSearch()
  const { data: revenue } = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, range, filters)
  )
  const previous = useSuspenseQuery(
    revenueOverviewQueryOptions(
      slug,
      siteId,
      previousStatsRange(range),
      filters
    )
  )
  const metric = revenueChartMetricFromSearch(search.metric)

  if (!revenue.hasData) {
    return (
      <RevenueSetup slug={slug} siteId={siteId} connected={revenue.connected} />
    )
  }

  return (
    <>
      {revenue.ignoredFilters.length > 0 || revenue.otherCurrencies > 0 ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          {revenue.ignoredFilters.length > 0
            ? `Revenue ignores the ${revenue.ignoredFilters
                .map((key) => filterLabels[key].toLowerCase())
                .join(
                  ", "
                )} filter. Signups only record channel, landing page, country, and device. `
            : null}
          {revenue.otherCurrencies > 0
            ? `${revenue.currency.toUpperCase()} only · ${revenue.otherCurrencies} other ${revenue.otherCurrencies === 1 ? "currency" : "currencies"} hidden.`
            : null}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <RevenueKpiCards overview={revenue} previous={previous.data} />
        <div className="px-3 pt-1 pb-3 sm:px-4">
          <RevenueChart
            points={revenue.points}
            range={range}
            metric={metric}
            currency={revenue.currency}
            timeZone={timeZone}
            onMetricChange={(next) => patchSearch({ metric: next })}
            framed={false}
          />
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <MovementsPanel overview={revenue} />
        <Suspense fallback={<PanelSkeleton />}>
          <TopCustomersPanel slug={slug} siteId={siteId} />
        </Suspense>
      </div>
    </>
  )
}

function PanelSkeleton() {
  return <Skeleton className="h-64 rounded-xl" />
}

function RevenueSetup({
  slug,
  siteId,
  connected,
}: {
  slug: string
  siteId: string
  connected: boolean
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-dashed border-border p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-lg space-y-1">
        <h3 className="text-[15px] font-medium tracking-tight">
          {connected ? "Waiting for revenue" : "Connect Stripe for MRR"}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {connected
            ? "Stripe is connected. Run a sync from settings to import customers, subscriptions, and paid invoices."
            : "Connect Stripe to see MRR, ARR, movements, and customers. Restricted key only — Zani never writes to your Stripe account."}
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <Link
          to="/businesses/$slug/sites/$siteId/settings"
          params={{ slug, siteId }}
          hash="revenue"
        >
          {connected ? "Open settings" : "Set up revenue"}
        </Link>
      </Button>
    </section>
  )
}

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Suspense } from "react"

import { Button } from "@components/ui/button"
import { Skeleton } from "@components/ui/skeleton"
import { siteStatsQueryOptions } from "@features/sites/api"
import { filterLabels } from "@features/sites/search"
import { useSiteSearch } from "@features/sites/use-site-search"

import {
  formatCompactMoney,
  formatMoney,
  revenueOverviewQueryOptions,
} from "./api"
import { AttributionPanel } from "./revenue-panels"

export function AttributionPage() {
  const {
    slug,
    siteId,
    search,
    range,
    filters,
    includeBots,
    patchSearch,
  } = useSiteSearch()
  const { data: revenue } = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, range, filters)
  )
  const { data: totals } = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters, includeBots)
  )

  if (!revenue.hasData) {
    return (
      <AttributionSetup
        slug={slug}
        siteId={siteId}
        connected={revenue.connected}
      />
    )
  }

  const visitToPaid =
    totals.visitors > 0
      ? (revenue.newCustomers / totals.visitors) * 100
      : null
  const perVisitor =
    totals.visitors > 0
      ? Math.round(revenue.newMrr / totals.visitors)
      : null

  const kpis = [
    {
      label: "Visitors",
      value: totals.visitors.toLocaleString(),
    },
    {
      label: "Signups",
      value: revenue.signups.toLocaleString(),
    },
    {
      label: "New customers",
      value: revenue.newCustomers.toLocaleString(),
    },
    {
      label: "Visit → paid",
      value:
        visitToPaid === null
          ? "—"
          : `${visitToPaid < 10 ? visitToPaid.toFixed(1) : Math.round(visitToPaid)}%`,
    },
    {
      label: "Per visitor",
      value:
        perVisitor === null
          ? "—"
          : formatMoney(perVisitor, revenue.currency),
    },
    {
      label: "New MRR",
      value: formatCompactMoney(revenue.newMrr, revenue.currency),
    },
  ]

  return (
    <>
      {revenue.ignoredFilters.length > 0 || revenue.otherCurrencies > 0 ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          {revenue.ignoredFilters.length > 0
            ? `Attribution ignores the ${revenue.ignoredFilters
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
        <div className="flex flex-wrap gap-1 p-1.5">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="min-w-[7rem] flex-1 rounded-lg px-2.5 py-1.5"
            >
              <div className="text-[11px] text-muted-foreground">
                {kpi.label}
              </div>
              <div className="mt-0.5 font-mono text-xl font-medium tracking-tight tabular-nums">
                {kpi.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <Suspense fallback={<Skeleton className="h-64 rounded-xl" />}>
        <AttributionPanel
          slug={slug}
          siteId={siteId}
          range={range}
          filters={filters}
          includeBots={includeBots}
          by={search.by}
          touch={search.touch}
          overview={revenue}
          onChange={patchSearch}
        />
      </Suspense>
    </>
  )
}

function AttributionSetup({
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
          {connected
            ? "Waiting for paying customers"
            : "See which channels bring paying customers"}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {connected
            ? "Connect identify at signup, then sync Stripe so every customer links back to the channel, page, and country they came from."
            : "Connect Stripe and call zani.identify() at signup to attribute MRR to first and last touch."}
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <Link
          to="/businesses/$slug/sites/$siteId/settings"
          params={{ slug, siteId }}
          hash="revenue"
        >
          {connected ? "Open settings" : "Set up attribution"}
        </Link>
      </Button>
    </section>
  )
}

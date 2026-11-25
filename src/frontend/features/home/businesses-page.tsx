import { useQueries, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"

import { Button } from "@components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@components/ui/empty"

import { formatMoney } from "@features/revenue/api"
import {
  accountSitesQueryOptions,
  changePercent,
  sitesSummaryQueryOptions,
  type SiteSummary,
} from "@features/sites/api"

function Delta({ value, label }: { value: number; label: string }) {
  if (value === 0) return null
  return (
    <span className={value > 0 ? "text-emerald-600" : "text-red-600"}>
      {label}
    </span>
  )
}

function SiteNumbers({ summary }: { summary: SiteSummary | undefined }) {
  if (!summary) return null
  const visitorsChange = changePercent(
    summary.visitors,
    summary.previousVisitors
  )
  const mrrChange = summary.mrr ? summary.mrr.value - summary.mrr.previous : 0
  return (
    <>
      <span className="flex items-baseline justify-end gap-1.5 sm:w-36">
        <span className="text-foreground">
          {summary.visitors.toLocaleString()}
        </span>
        <span>visitors</span>
        {visitorsChange !== null ? (
          <Delta
            value={visitorsChange}
            label={`${visitorsChange > 0 ? "+" : ""}${visitorsChange}%`}
          />
        ) : null}
      </span>
      {summary.mrr ? (
        <span className="flex items-baseline justify-end gap-1.5 sm:w-40">
          <span className="text-foreground">
            {formatMoney(summary.mrr.value, summary.mrr.currency)}
          </span>
          <span>MRR</span>
          <Delta
            value={mrrChange}
            label={`${mrrChange > 0 ? "+" : "−"}${formatMoney(Math.abs(mrrChange), summary.mrr.currency)}`}
          />
        </span>
      ) : (
        <span className="hidden sm:block sm:w-40" />
      )}
    </>
  )
}

export function BusinessesPage() {
  const { data: sites } = useSuspenseQuery(accountSitesQueryOptions())
  const slugs = [...new Set(sites.map((site) => site.slug))]
  const summaries = useQueries({
    queries: slugs.map((slug) => sitesSummaryQueryOptions(slug)),
    combine: (results) =>
      new Map(
        results.flatMap((result) =>
          (result.data ?? []).map((summary) => [summary.siteId, summary])
        )
      ),
  })

  return (
    <div className="flex flex-1 flex-col">
      {sites.length === 0 ? (
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle>No sites yet</EmptyTitle>
            <EmptyDescription>
              Add a domain to record its pageviews.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/businesses/new">Add a site</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-1 flex-col gap-8">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-4xl font-light tracking-tight">Sites</h1>
            <Button asChild className="shrink-0">
              <Link to="/businesses/new">Add a site</Link>
            </Button>
          </div>

          <ul className="flex flex-col overflow-hidden rounded-md bg-secondary">
            {sites.map((site) => (
              <li
                key={site.id}
                className="relative border-b border-dashed transition-colors last:border-none hover:bg-muted"
              >
                <Link
                  to="/businesses/$slug/sites/$siteId"
                  params={{ slug: site.slug, siteId: site.id }}
                  className="absolute inset-0"
                  aria-label={`Open ${site.name}`}
                />
                <div className="pointer-events-none relative flex items-baseline justify-between gap-4 px-3 py-3">
                  <span className="flex min-w-0 flex-1 items-baseline gap-3">
                    <span className="truncate">{site.name}</span>
                    <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">
                      {site.domain}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-5 font-mono text-xs text-muted-foreground tabular-nums">
                    {site.revokedAt ? (
                      <span>Stopped</span>
                    ) : (
                      <SiteNumbers summary={summaries.get(site.id)} />
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

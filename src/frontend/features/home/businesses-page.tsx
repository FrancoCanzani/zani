import { useMemo, useState, type ReactNode } from "react"
import { useQueries, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react"
import { cn } from "cn"

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

type NameSort = "asc" | "desc"

function Delta({ value, label }: { value: number; label: string }) {
  return (
    <span
      className={cn(
        "tabular-nums",
        value > 0 && "text-emerald-600",
        value < 0 && "text-red-600",
        value === 0 && "text-muted-foreground"
      )}
    >
      {label}
    </span>
  )
}

function visitorsDeltaLabel(change: number) {
  return `${change > 0 ? "+" : ""}${change}%`
}

function mrrDeltaLabel(change: number, currency: string) {
  const sign = change > 0 ? "+" : change < 0 ? "−" : ""
  return `${sign}${formatMoney(Math.abs(change), currency)}`
}

function MetricPair({
  total,
  variation,
  className,
}: {
  total: string
  variation: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex w-28 items-baseline justify-end gap-1.5 sm:w-32",
        className
      )}
    >
      <span className="text-foreground tabular-nums">{total}</span>
      {variation}
    </span>
  )
}

function SiteNumbers({ summary }: { summary: SiteSummary | undefined }) {
  if (!summary) return null
  const visitorsChange =
    changePercent(summary.visitors, summary.previousVisitors) ?? 0
  const mrrChange = summary.mrr ? summary.mrr.value - summary.mrr.previous : 0
  return (
    <>
      <MetricPair
        total={summary.visitors.toLocaleString()}
        variation={
          <Delta
            value={visitorsChange}
            label={visitorsDeltaLabel(visitorsChange)}
          />
        }
      />
      {summary.mrr ? (
        <MetricPair
          total={formatMoney(summary.mrr.value, summary.mrr.currency)}
          variation={
            <Delta
              value={mrrChange}
              label={mrrDeltaLabel(mrrChange, summary.mrr.currency)}
            />
          }
        />
      ) : (
        <span className="hidden w-28 sm:block sm:w-32" />
      )}
    </>
  )
}

function TotalsRow({ summaries }: { summaries: SiteSummary[] }) {
  const visitors = summaries.reduce((sum, row) => sum + row.visitors, 0)
  const previousVisitors = summaries.reduce(
    (sum, row) => sum + row.previousVisitors,
    0
  )
  const visitorsChange = changePercent(visitors, previousVisitors) ?? 0

  const mrrByCurrency = new Map<string, { value: number; previous: number }>()
  for (const row of summaries) {
    if (!row.mrr) continue
    const known = mrrByCurrency.get(row.mrr.currency) ?? {
      value: 0,
      previous: 0,
    }
    mrrByCurrency.set(row.mrr.currency, {
      value: known.value + row.mrr.value,
      previous: known.previous + row.mrr.previous,
    })
  }
  const mrr =
    [...mrrByCurrency.entries()].sort((a, b) => b[1].value - a[1].value)[0] ??
    null
  const mrrChange = mrr ? mrr[1].value - mrr[1].previous : 0

  return (
    <li className="border-t border-dashed px-3 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium">Total</span>
        <span className="flex shrink-0 items-baseline gap-2 font-mono text-xs text-muted-foreground">
          <MetricPair
            total={visitors.toLocaleString()}
            variation={
              <Delta
                value={visitorsChange}
                label={visitorsDeltaLabel(visitorsChange)}
              />
            }
          />
          {mrr ? (
            <MetricPair
              total={formatMoney(mrr[1].value, mrr[0])}
              variation={
                <Delta
                  value={mrrChange}
                  label={mrrDeltaLabel(mrrChange, mrr[0])}
                />
              }
            />
          ) : (
            <span className="hidden w-28 sm:block sm:w-32" />
          )}
        </span>
      </div>
    </li>
  )
}

export function BusinessesPage() {
  const { data: sites } = useSuspenseQuery(accountSitesQueryOptions())
  const [nameSort, setNameSort] = useState<NameSort>("asc")
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

  const sortedSites = useMemo(() => {
    const copy = [...sites]
    copy.sort((a, b) => {
      const result = a.name.localeCompare(b.name, undefined, {
        sensitivity: "base",
      })
      return nameSort === "asc" ? result : -result
    })
    return copy
  }, [sites, nameSort])

  const activeSummaries = useMemo(
    () =>
      sortedSites.flatMap((site) => {
        if (site.revokedAt) return []
        const summary = summaries.get(site.id)
        return summary ? [summary] : []
      }),
    [sortedSites, summaries]
  )

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
            <li className="flex items-center justify-between gap-3 px-3 py-2 text-[11px] tracking-wide text-muted-foreground uppercase">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-sm hover:text-foreground"
                onClick={() =>
                  setNameSort((current) =>
                    current === "asc" ? "desc" : "asc"
                  )
                }
              >
                Name
                {nameSort === "asc" ? (
                  <ArrowUpIcon className="size-3" />
                ) : (
                  <ArrowDownIcon className="size-3" />
                )}
              </button>
              <span className="flex shrink-0 items-center gap-2">
                <span className="w-28 text-right sm:w-32">Visitors</span>
                <span className="hidden w-28 text-right sm:block sm:w-32">
                  MRR
                </span>
              </span>
            </li>
            {sortedSites.map((site) => (
              <li
                key={site.id}
                className="relative border-t border-dashed transition-colors hover:bg-muted"
              >
                <Link
                  to="/businesses/$slug/sites/$siteId"
                  params={{ slug: site.slug, siteId: site.id }}
                  className="absolute inset-0"
                  aria-label={`Open ${site.name}`}
                />
                <div className="pointer-events-none relative flex items-center justify-between gap-3 px-3 py-3">
                  <span className="flex min-w-0 flex-1 items-baseline gap-3">
                    <span className="truncate text-sm">{site.name}</span>
                    <span className="hidden truncate font-mono text-xs text-muted-foreground sm:inline">
                      {site.domain}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-baseline gap-2 font-mono text-xs text-muted-foreground">
                    {site.revokedAt ? (
                      <span>Stopped</span>
                    ) : (
                      <SiteNumbers summary={summaries.get(site.id)} />
                    )}
                  </span>
                </div>
              </li>
            ))}
            {activeSummaries.length > 0 ? (
              <TotalsRow summaries={activeSummaries} />
            ) : null}
          </ul>
        </div>
      )}
    </div>
  )
}

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { startTransition } from "react"
import { toast } from "sonner"

import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@components/ui/table"
import { simulateSiteViews, sitesQueryOptions } from "@features/sites/api"
import { SiteTabs } from "@features/sites/site-tabs"

import {
  attributionQueryOptions,
  formatMoney,
  revenueCustomersQueryOptions,
  revenueOverviewQueryOptions,
  type RevenueOverview,
} from "./api"
import { MrrChart } from "./mrr-chart"
import {
  attributionDimensions,
  dimensionLabels,
  revenueRangeLabels,
  revenueRanges,
  touchLabels,
  touches,
  type RevenueSearch,
} from "./search"

const routeApi = getRouteApi(
  "/_authed/businesses/$slug/_shell/sites/$siteId/revenue"
)

function percentChange(current: number, previous: number) {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

function formatDate(ms: number | null) {
  if (ms === null) return "—"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms)
}

export function RevenuePage() {
  const { slug, siteId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const queryClient = useQueryClient()
  const { data: sitesData } = useSuspenseQuery(sitesQueryOptions(slug))
  const { data: overview } = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, search.range)
  )
  const site = sitesData.sites.find((item) => item.id === siteId)

  function patchSearch(patch: Partial<RevenueSearch>) {
    startTransition(() => {
      void navigate({ search: (prev) => ({ ...prev, ...patch }) })
    })
  }

  const simulate = useMutation({
    mutationFn: () => simulateSiteViews(slug, siteId),
    onSuccess: async (result) => {
      toast.success(
        `Simulated ${result.signups} signups and ${result.customers} customers`
      )
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["revenue", slug, siteId] }),
        queryClient.invalidateQueries({
          queryKey: ["site-stats", slug, siteId],
        }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">{site?.name}</h1>
          <p className="text-sm text-muted-foreground">{site?.domain}</p>
        </div>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV ? (
            <Button
              type="button"
              variant="outline"
              disabled={simulate.isPending || site?.revokedAt !== null}
              onClick={() => simulate.mutate()}
            >
              {simulate.isPending ? "Simulating…" : "Simulate data"}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link
              to="/businesses/$slug/sites/$siteId/settings"
              params={{ slug, siteId }}
            >
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <SiteTabs slug={slug} siteId={siteId} active="revenue" />

      {overview.hasData ? (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {revenueRanges.map((range) => (
              <Button
                key={range}
                type="button"
                size="xs"
                variant={search.range === range ? "default" : "outline"}
                onClick={() => patchSearch({ range })}
              >
                {revenueRangeLabels[range]}
              </Button>
            ))}
          </div>
          <RevenueKpis overview={overview} />
          <section className="space-y-3">
            <p className="text-sm text-muted-foreground">MRR over time</p>
            <MrrChart points={overview.points} currency={overview.currency} />
            {overview.otherCurrencies > 0 ? (
              <p className="text-xs text-muted-foreground">
                Showing {overview.currency.toUpperCase()} only.{" "}
                {overview.otherCurrencies} other{" "}
                {overview.otherCurrencies === 1
                  ? "currency is"
                  : "currencies are"}{" "}
                excluded.
              </p>
            ) : null}
          </section>
          <AttributionSection
            slug={slug}
            siteId={siteId}
            search={search}
            overview={overview}
            onChange={patchSearch}
          />
          <CustomersSection slug={slug} siteId={siteId} />
        </>
      ) : (
        <RevenueEmpty
          slug={slug}
          siteId={siteId}
          connected={overview.connected}
        />
      )}
    </div>
  )
}

function RevenueKpis({ overview }: { overview: RevenueOverview }) {
  const money = (value: number) => formatMoney(value, overview.currency)
  const kpis: Array<{
    label: string
    value: string
    delta?: number | null
    hint?: string
  }> = [
    {
      label: "MRR",
      value: money(overview.mrr),
      delta: percentChange(overview.mrr, overview.mrrStart),
    },
    {
      label: "Net new MRR",
      value: `${overview.netNewMrr >= 0 ? "+" : ""}${money(overview.netNewMrr)}`,
    },
    {
      label: "New MRR",
      value: money(overview.newMrr),
      hint: `${overview.newCustomers} new customers`,
    },
    { label: "Expansion", value: money(overview.expansionMrr) },
    {
      label: "Churned MRR",
      value: money(overview.churnedMrr + overview.contractionMrr),
      hint: `${overview.churnedCustomers} churned · ${money(overview.contractionMrr)} contraction`,
    },
    { label: "Revenue churn", value: `${overview.revenueChurnRate}%` },
    { label: "Paying customers", value: String(overview.payingCustomers) },
    { label: "ARPA", value: money(overview.arpa) },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-xl border border-border/80 px-3 py-3"
        >
          <div className="text-sm text-muted-foreground">{kpi.label}</div>
          <div className="mt-1 flex items-baseline gap-2">
            <div className="font-mono text-2xl font-medium tracking-tight tabular-nums">
              {kpi.value}
            </div>
            {kpi.delta === undefined || kpi.delta === null ? null : (
              <span
                className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums ${
                  kpi.delta > 0
                    ? "bg-emerald-500/10 text-emerald-700"
                    : kpi.delta < 0
                      ? "bg-red-500/10 text-red-700"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {kpi.delta > 0 ? "+" : ""}
                {kpi.delta}%
              </span>
            )}
          </div>
          {kpi.hint ? (
            <div className="mt-1 truncate text-xs text-muted-foreground">
              {kpi.hint}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function AttributionSection({
  slug,
  siteId,
  search,
  overview,
  onChange,
}: {
  slug: string
  siteId: string
  search: RevenueSearch
  overview: RevenueOverview
  onChange: (patch: Partial<RevenueSearch>) => void
}) {
  const { data } = useSuspenseQuery(
    attributionQueryOptions(slug, siteId, search)
  )
  const money = (value: number) => formatMoney(value, data.currency)
  const maxMrr = Math.max(1, ...data.rows.map((row) => row.mrr))

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-sm text-muted-foreground">
            Where revenue comes from
          </h2>
          <p className="text-xs text-muted-foreground">
            {overview.identifiedCustomers} of {overview.payingCustomers} paying
            customers are linked to a signup.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            {attributionDimensions.map((by) => (
              <Button
                key={by}
                type="button"
                size="xs"
                variant={search.by === by ? "secondary" : "ghost"}
                onClick={() => onChange({ by })}
              >
                {dimensionLabels[by]}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            {touches.map((touch) => (
              <Button
                key={touch}
                type="button"
                size="xs"
                variant={search.touch === touch ? "secondary" : "ghost"}
                onClick={() => onChange({ touch })}
              >
                {touchLabels[touch]}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{dimensionLabels[search.by]}</TableHead>
              <TableHead className="text-right">Signups</TableHead>
              <TableHead className="text-right">Customers</TableHead>
              <TableHead className="text-right">Conversion</TableHead>
              <TableHead className="text-right">New MRR</TableHead>
              <TableHead className="text-right">MRR now</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-6 text-center text-muted-foreground"
                >
                  No signups or customers in this range.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="relative max-w-64">
                    <span
                      aria-hidden
                      className="absolute inset-y-1 left-0 rounded-r bg-foreground/[0.06]"
                      style={{ width: `${(row.mrr / maxMrr) * 100}%` }}
                    />
                    <span className="relative block truncate font-mono text-[13px]">
                      {row.key || "(none)"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.signups}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.customers}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
                    {row.signups > 0
                      ? `${Math.round((row.customers / row.signups) * 1000) / 10}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money(row.newMrr)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {money(row.mrr)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Signups are counted by signup date and customers by first payment, both
        within the selected range.
      </p>
    </section>
  )
}

function CustomersSection({ slug, siteId }: { slug: string; siteId: string }) {
  const { data } = useSuspenseQuery(revenueCustomersQueryOptions(slug, siteId))

  return (
    <section className="space-y-3">
      <h2 className="text-sm text-muted-foreground">Customers</h2>
      <div className="rounded-xl border border-border/80">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">MRR</TableHead>
              <TableHead>First touch</TableHead>
              <TableHead>Landing page</TableHead>
              <TableHead>Paying since</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="max-w-56">
                  <div className="truncate">
                    {customer.name || customer.email || customer.id}
                  </div>
                  {customer.name && customer.email ? (
                    <div className="truncate text-xs text-muted-foreground">
                      {customer.email}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {customer.churnedAt !== null ? (
                    <Badge variant="outline">Churned</Badge>
                  ) : (
                    formatMoney(customer.mrr, customer.currency)
                  )}
                </TableCell>
                <TableCell className="font-mono text-[13px]">
                  {customer.firstSource ?? (
                    <span className="text-muted-foreground">
                      not identified
                    </span>
                  )}
                  {customer.firstCampaign ? (
                    <span className="text-muted-foreground">
                      {" "}
                      / {customer.firstCampaign}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="max-w-40 truncate font-mono text-[13px] text-muted-foreground">
                  {customer.firstLanding || "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(customer.firstPaidAt)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

function RevenueEmpty({
  slug,
  siteId,
  connected,
}: {
  slug: string
  siteId: string
  connected: boolean
}) {
  return (
    <section className="max-w-xl space-y-4">
      <div className="space-y-2">
        <h2 className="text-sm text-muted-foreground">
          {connected ? "Waiting for revenue" : "Connect Stripe"}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {connected
            ? "Stripe is connected. Run a sync from settings to import customers, subscriptions, and paid invoices."
            : "See which sources bring paying customers. Connect Stripe with a restricted key, then call zani.identify() when someone signs up."}
        </p>
      </div>
      <Button asChild variant="outline">
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

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { startTransition, type ReactNode } from "react"
import { toast } from "sonner"

import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@components/ui/sheet"
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
  type RevenueCustomer,
  type RevenueOverview,
} from "./api"
import { MrrChart } from "./mrr-chart"
import { Segmented } from "./segmented"
import {
  attributionDimensions,
  revenueRangeLabels,
  revenueRanges,
  touchLabels,
  touches,
  type AttributionDimension,
  type RevenueSearch,
} from "./search"

const routeApi = getRouteApi(
  "/_authed/businesses/$slug/_shell/sites/$siteId/revenue"
)

const topCustomerCount = 8

const dimensionTabLabels: Record<AttributionDimension, string> = {
  source: "Source",
  medium: "Medium",
  campaign: "Campaign",
  landing: "Landing",
}

const dimensionTitles: Record<AttributionDimension, string> = {
  source: "Revenue by source",
  medium: "Revenue by medium",
  campaign: "Revenue by campaign",
  landing: "Revenue by landing page",
}

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

function signedMoney(value: number, currency: string) {
  if (value === 0) return formatMoney(0, currency)
  return `${value > 0 ? "+" : "−"}${formatMoney(Math.abs(value), currency)}`
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-4xl font-light tracking-tight">
            {site?.name}
          </h1>
          <p className="text-sm text-muted-foreground">{site?.domain}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {import.meta.env.DEV ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
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
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div className="flex items-baseline gap-3">
                <p className="text-sm text-muted-foreground">MRR over time</p>
                <p className="font-mono text-sm text-muted-foreground tabular-nums">
                  {signedMoney(overview.netNewMrr, overview.currency)} in range
                </p>
              </div>
              {overview.otherCurrencies > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {overview.currency.toUpperCase()} only ·{" "}
                  {overview.otherCurrencies} other{" "}
                  {overview.otherCurrencies === 1 ? "currency" : "currencies"}{" "}
                  hidden
                </p>
              ) : null}
            </div>
            <MrrChart points={overview.points} currency={overview.currency} />
          </section>

          <div className="grid gap-3 md:grid-cols-2">
            <MovementsPanel overview={overview} />
            <TopCustomersPanel slug={slug} siteId={siteId} />
          </div>

          <AttributionPanel
            slug={slug}
            siteId={siteId}
            search={search}
            overview={overview}
            onChange={patchSearch}
          />
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

function DeltaBadge({ value }: { value: number }) {
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums ${
        value > 0
          ? "bg-emerald-500/10 text-emerald-700"
          : value < 0
            ? "bg-red-500/10 text-red-700"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  )
}

function RevenueKpis({ overview }: { overview: RevenueOverview }) {
  const money = (value: number) => formatMoney(value, overview.currency)
  const kpis: Array<{
    label: string
    value: string
    delta?: number | null
    hint: string
  }> = [
    {
      label: "MRR",
      value: money(overview.mrr),
      delta: percentChange(overview.mrr, overview.mrrStart),
      hint: `${money(overview.mrr * 12)} ARR`,
    },
    {
      label: "Net new MRR",
      value: signedMoney(overview.netNewMrr, overview.currency),
      hint: `${money(overview.newMrr + overview.expansionMrr)} in · ${money(overview.churnedMrr + overview.contractionMrr)} out`,
    },
    {
      label: "Paying customers",
      value: String(overview.payingCustomers),
      hint: `${overview.newCustomers} new · ${overview.churnedCustomers} churned`,
    },
    {
      label: "ARPA",
      value: money(overview.arpa),
      hint: "per paying customer",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.label}
          className="min-w-0 rounded-xl border border-border/80 px-3 py-3"
        >
          <div className="text-sm text-muted-foreground">{kpi.label}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <div className="font-mono text-2xl font-medium tracking-tight tabular-nums sm:text-3xl">
              {kpi.value}
            </div>
            {kpi.delta === undefined || kpi.delta === null ? null : (
              <DeltaBadge value={kpi.delta} />
            )}
          </div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {kpi.hint}
          </div>
        </div>
      ))}
    </div>
  )
}

function Panel({
  title,
  action,
  children,
}: {
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/70 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

function MovementsPanel({ overview }: { overview: RevenueOverview }) {
  const rows = [
    {
      label: "New",
      amount: overview.newMrr,
      detail: `${overview.newCustomers} customers`,
    },
    { label: "Expansion", amount: overview.expansionMrr, detail: "upgrades" },
    {
      label: "Contraction",
      amount: -overview.contractionMrr,
      detail: "downgrades",
    },
    {
      label: "Churn",
      amount: -overview.churnedMrr,
      detail: `${overview.churnedCustomers} customers`,
    },
  ]
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.amount)))

  return (
    <Panel title="MRR movements">
      <ul className="space-y-1.5">
        {rows.map((row) => (
          <li
            key={row.label}
            className="relative flex h-[30px] items-center gap-2 overflow-hidden rounded-md px-2 text-[13px]"
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 ${row.amount < 0 ? "bg-red-500/[0.08]" : "bg-emerald-500/[0.08]"}`}
              style={{ width: `${(Math.abs(row.amount) / max) * 100}%` }}
            />
            <span className="relative flex-1">{row.label}</span>
            <span className="relative text-xs text-muted-foreground">
              {row.detail}
            </span>
            <span
              className={`relative w-24 text-right font-mono tabular-nums ${row.amount < 0 ? "text-red-700" : row.amount > 0 ? "text-emerald-700" : "text-muted-foreground"}`}
            >
              {signedMoney(row.amount, overview.currency)}
            </span>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-1.5 border-t px-2 pt-3 text-[13px]">
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Net new MRR</dt>
          <dd className="font-mono font-medium tabular-nums">
            {signedMoney(overview.netNewMrr, overview.currency)}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">Revenue churn</dt>
          <dd className="font-mono tabular-nums">
            {overview.mrrStart > 0 ? `${overview.revenueChurnRate}%` : "—"}
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-muted-foreground">MRR at range start</dt>
          <dd className="font-mono tabular-nums">
            {formatMoney(overview.mrrStart, overview.currency)}
          </dd>
        </div>
      </dl>
    </Panel>
  )
}

function CustomerSource({ customer }: { customer: RevenueCustomer }) {
  if (!customer.firstSource) {
    return <span className="text-muted-foreground italic">not identified</span>
  }
  return (
    <>
      {customer.firstSource}
      {customer.firstCampaign ? (
        <span className="text-muted-foreground">
          {" "}
          / {customer.firstCampaign}
        </span>
      ) : null}
    </>
  )
}

function CustomerMrr({ customer }: { customer: RevenueCustomer }) {
  if (customer.churnedAt !== null) {
    return <Badge variant="outline">Churned</Badge>
  }
  return <>{formatMoney(customer.mrr, customer.currency)}</>
}

function TopCustomersPanel({ slug, siteId }: { slug: string; siteId: string }) {
  const { data } = useSuspenseQuery(revenueCustomersQueryOptions(slug, siteId))
  const top = data.customers.slice(0, topCustomerCount)

  return (
    <Panel
      title="Top customers"
      action={
        data.customers.length > topCustomerCount ? (
          <AllCustomersSheet customers={data.customers} />
        ) : null
      }
    >
      <ul className="space-y-1.5">
        {top.map((customer) => (
          <li
            key={customer.id}
            className="flex h-[30px] items-center gap-2 px-2 text-[13px]"
          >
            <span className="min-w-0 flex-1 truncate">
              {customer.name || customer.email || customer.id}
            </span>
            <span className="hidden max-w-40 truncate font-mono text-xs text-muted-foreground sm:block">
              <CustomerSource customer={customer} />
            </span>
            <span className="w-20 text-right font-mono tabular-nums">
              <CustomerMrr customer={customer} />
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  )
}

function AllCustomersSheet({ customers }: { customers: RevenueCustomer[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" size="xs" variant="ghost">
          View all {customers.length}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Customers</SheetTitle>
          <SheetDescription>
            Paying and churned customers, highest MRR first.
          </SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead>First touch</TableHead>
                <TableHead className="hidden sm:table-cell">
                  Paying since
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="max-w-48">
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
                    <CustomerMrr customer={customer} />
                  </TableCell>
                  <TableCell className="max-w-44 font-mono text-xs">
                    <div className="truncate">
                      <CustomerSource customer={customer} />
                    </div>
                    {customer.firstLanding ? (
                      <div className="truncate text-muted-foreground">
                        {customer.firstLanding}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground sm:table-cell">
                    {formatDate(customer.firstPaidAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  )
}

const headClass = "h-8 px-2 text-xs font-normal text-muted-foreground"

function AttributionPanel({
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
    <Panel
      title={dimensionTitles[search.by]}
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Touch"
            options={touches}
            value={search.touch}
            labels={touchLabels}
            onChange={(touch) => onChange({ touch })}
          />
          <Segmented
            label="Dimension"
            options={attributionDimensions}
            value={search.by}
            labels={dimensionTabLabels}
            onChange={(by) => onChange({ by })}
          />
        </div>
      }
    >
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>
              {dimensionTabLabels[search.by]}
            </TableHead>
            <TableHead className={`${headClass} text-right`}>Signups</TableHead>
            <TableHead className={`${headClass} text-right`}>
              Customers
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right sm:table-cell`}
            >
              Conversion
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right sm:table-cell`}
            >
              New MRR
            </TableHead>
            <TableHead className={`${headClass} text-right`}>MRR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={6}
                className="py-6 text-center text-muted-foreground"
              >
                No signups or customers in this range.
              </TableCell>
            </TableRow>
          ) : (
            data.rows.map((row) => {
              const unidentified = row.key === "(not identified)"
              return (
                <TableRow key={row.key} className="border-0">
                  <TableCell className="relative max-w-56 p-0">
                    <span
                      aria-hidden
                      className="absolute inset-y-0.5 left-0 rounded-md bg-foreground/[0.06]"
                      style={{ width: `${(row.mrr / maxMrr) * 100}%` }}
                    />
                    <span
                      className={`relative block truncate px-2 py-1.5 ${unidentified ? "text-muted-foreground italic" : "font-mono"}`}
                    >
                      {unidentified ? "not identified" : row.key || "(none)"}
                    </span>
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono text-muted-foreground tabular-nums">
                    {unidentified ? "—" : row.signups}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums">
                    {row.customers}
                  </TableCell>
                  <TableCell className="hidden px-2 py-1.5 text-right font-mono text-muted-foreground tabular-nums sm:table-cell">
                    {row.signups > 0
                      ? `${Math.round((row.customers / row.signups) * 1000) / 10}%`
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden px-2 py-1.5 text-right font-mono text-muted-foreground tabular-nums sm:table-cell">
                    {money(row.newMrr)}
                  </TableCell>
                  <TableCell className="px-2 py-1.5 text-right font-mono font-medium tabular-nums">
                    {money(row.mrr)}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <p className="mt-3 px-2 text-xs leading-relaxed text-muted-foreground">
        {overview.identifiedCustomers} of {overview.payingCustomers} paying
        customers are linked to a signup. Signups count by signup date,
        customers by first payment, both within the range.
      </p>
    </Panel>
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
            : "See which sources bring paying customers. Call zani.identify() when someone signs up, then connect Stripe with a restricted key."}
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

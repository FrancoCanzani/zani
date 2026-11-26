import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"

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

import {
  siteStatsQueryOptions,
  type StatsFilters,
  type StatsRange,
} from "@features/sites/api"
import { DimensionIcon } from "@features/sites/dimension-icon"
import type { Breakdown } from "@features/sites/panels"
import {
  attributionDimensions,
  touches,
  type AttributionDimension,
  type Touch,
} from "@features/sites/search"

import {
  attributionQueryOptions,
  formatMoney,
  revenueCustomersQueryOptions,
  type RevenueCustomer,
  type RevenueOverview,
} from "./api"
import { Segmented } from "@components/segmented"

const topCustomerCount = 8
const unidentifiedKey = "(not identified)"

const touchLabels: Record<Touch, string> = {
  first: "First touch",
  last: "Last touch",
}

const dimensionLabels: Record<AttributionDimension, string> = {
  source: "Channel",
  medium: "Medium",
  campaign: "Campaign",
  landing: "Landing page",
}

const dimensionTabLabels: Record<AttributionDimension, string> = {
  source: "Channel",
  medium: "Medium",
  campaign: "Campaign",
  landing: "Landing",
}

const trafficBreakdown: Record<AttributionDimension, Breakdown> = {
  source: "source",
  medium: "utm_medium",
  campaign: "utm_campaign",
  landing: "entry",
}

function signedMoney(value: number, currency: string) {
  if (value === 0) return formatMoney(0, currency)
  return `${value > 0 ? "+" : "−"}${formatMoney(Math.abs(value), currency)}`
}

function formatDate(ms: number | null) {
  if (ms === null) return "—"
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(ms)
}

function rate(part: number, whole: number) {
  if (whole <= 0) return "—"
  const value = (part / whole) * 100
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
}

function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-xl border border-border/70 bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-0.5">
          <h2 className="text-[15px] font-medium tracking-tight">{title}</h2>
          {description ? (
            <p className="text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export function MovementsPanel({ overview }: { overview: RevenueOverview }) {
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
    <Panel title="MRR movements" description="How MRR changed in this range">
      <ul className="space-y-1">
        {rows.map((row) => (
          <li
            key={row.label}
            className="relative flex h-[30px] items-center gap-2 overflow-hidden rounded-md px-2 text-[13px]"
          >
            <span
              aria-hidden
              className={`absolute inset-y-0 left-0 rounded-md ${row.amount < 0 ? "bg-red-500/10" : "bg-emerald-500/10"}`}
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
          <dt className="text-muted-foreground">ARR</dt>
          <dd className="font-mono tabular-nums">
            {formatMoney(overview.mrr * 12, overview.currency)}
          </dd>
        </div>
      </dl>
    </Panel>
  )
}

function daysLabel(value: number | null) {
  if (value === null) return "—"
  const rounded = Math.round(value * 10) / 10
  return `${rounded} ${rounded === 1 ? "day" : "days"}`
}

export function PaymentsPanel({ overview }: { overview: RevenueOverview }) {
  if (!overview.hasPayments) {
    return (
      <Panel
        title="Payments"
        description="Cash collected from Stripe charges"
      >
        <p className="py-6 text-sm leading-relaxed text-muted-foreground">
          No charges imported yet. Add Charges read on the restricted key and
          re-sync, or wait for{" "}
          <code className="font-mono text-xs">charge.succeeded</code> webhooks.
        </p>
      </Panel>
    )
  }

  const rows = [
    {
      label: "Collected",
      value: formatMoney(overview.revenue, overview.currency),
      detail: `${overview.payments} payments`,
    },
    {
      label: "Refunds",
      value: formatMoney(overview.refunds, overview.currency),
      detail: "amount refunded",
    },
    {
      label: "One-time",
      value: formatMoney(overview.oneTimeRevenue, overview.currency),
      detail: "no invoice",
    },
    {
      label: "LTV",
      value:
        overview.ltv === null
          ? "—"
          : formatMoney(overview.ltv, overview.currency),
      detail: "avg lifetime revenue",
    },
    {
      label: "Trial → paid",
      value: rate(overview.trialConversions, overview.trials),
      detail: `${overview.trialConversions} of ${overview.trials}`,
    },
    {
      label: "Days to pay",
      value: daysLabel(overview.medianDaysToPay),
      detail: "median first visit → paid",
    },
  ]

  return (
    <Panel
      title="Payments"
      description="Cash collected, refunds, and time to pay"
    >
      <dl className="space-y-1.5 text-[13px]">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
          >
            <div className="min-w-0">
              <dt>{row.label}</dt>
              <dd className="text-xs text-muted-foreground">{row.detail}</dd>
            </div>
            <dd className="shrink-0 font-mono tabular-nums">{row.value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  )
}

function CustomerSource({ customer }: { customer: RevenueCustomer }) {
  if (!customer.firstSource) {
    return <span className="text-muted-foreground italic">not identified</span>
  }
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <DimensionIcon dimension="source" value={customer.firstSource} />
      <span className="truncate">
        {customer.firstSource}
        {customer.firstCampaign ? (
          <span className="text-muted-foreground">
            {" "}
            / {customer.firstCampaign}
          </span>
        ) : null}
      </span>
    </span>
  )
}

function CustomerMrr({ customer }: { customer: RevenueCustomer }) {
  if (customer.churnedAt !== null) {
    return <Badge variant="outline">Churned</Badge>
  }
  return <>{formatMoney(customer.mrr, customer.currency)}</>
}

export function TopCustomersPanel({
  slug,
  siteId,
}: {
  slug: string
  siteId: string
}) {
  const { data } = useSuspenseQuery(revenueCustomersQueryOptions(slug, siteId))
  const top = data.customers.slice(0, topCustomerCount)

  return (
    <Panel
      title="Top customers"
      description="Highest MRR and where they first came from"
      action={
        data.customers.length > topCustomerCount ? (
          <AllCustomersSheet customers={data.customers} />
        ) : null
      }
    >
      <ul className="space-y-1">
        {top.map((customer) => (
          <li
            key={customer.id}
            className="flex h-[30px] items-center gap-3 rounded-md px-2 text-[13px] hover:bg-muted/50"
          >
            <span className="min-w-0 flex-1 truncate">
              {customer.name || customer.email || customer.id}
            </span>
            <span className="hidden max-w-44 min-w-0 font-mono text-xs sm:flex">
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
                    <CustomerSource customer={customer} />
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
const cellClass = "px-2 py-1.5 text-right font-mono tabular-nums"

export function AttributionPanel({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  by,
  touch,
  overview,
  onChange,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  by: AttributionDimension
  touch: Touch
  overview: RevenueOverview
  onChange: (patch: { by?: AttributionDimension; touch?: Touch }) => void
}) {
  const { data } = useSuspenseQuery(
    attributionQueryOptions(slug, siteId, range, filters, by, touch)
  )
  const traffic = useQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      trafficBreakdown[by],
      range,
      filters,
      includeBots
    )
  )
  const visitorsByKey = new Map(
    (traffic.data?.points ?? []).map((point) => [point.series, point.visitors])
  )
  const money = (value: number) => formatMoney(value, data.currency)
  const maxMrr = Math.max(1, ...data.rows.map((row) => row.newMrr))
  const iconDimension: Breakdown | null = by === "source" ? "source" : null

  return (
    <Panel
      title="Revenue attribution"
      description="The full path from visit to paying customer, by channel"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Touch"
            options={touches}
            value={touch}
            labels={touchLabels}
            onChange={(next) => onChange({ touch: next })}
          />
          <Segmented
            label="Dimension"
            options={attributionDimensions}
            value={by}
            labels={dimensionTabLabels}
            onChange={(next) => onChange({ by: next })}
          />
        </div>
      }
    >
      <Table className="text-[13px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className={headClass}>{dimensionLabels[by]}</TableHead>
            <TableHead
              className={`${headClass} hidden text-right md:table-cell`}
            >
              Visitors
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right sm:table-cell`}
            >
              Signups
            </TableHead>
            <TableHead className={`${headClass} text-right`}>
              Customers
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right md:table-cell`}
            >
              Visit → paid
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right xl:table-cell`}
            >
              Revenue
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right xl:table-cell`}
            >
              LTV
            </TableHead>
            <TableHead
              className={`${headClass} hidden text-right lg:table-cell`}
            >
              Days to pay
            </TableHead>
            <TableHead className={`${headClass} text-right`}>New MRR</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.rows.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell
                colSpan={9}
                className="py-6 text-center text-muted-foreground"
              >
                No signups or customers in this range.
              </TableCell>
            </TableRow>
          ) : (
            data.rows.map((row) => {
              const unidentified = row.key === unidentifiedKey
              const visitors = unidentified
                ? undefined
                : visitorsByKey.get(row.key)
              return (
                <TableRow key={row.key} className="border-0">
                  <TableCell className="relative max-w-56 p-0">
                    <span
                      aria-hidden
                      className="absolute inset-y-0.5 left-0 rounded-md bg-emerald-500/10"
                      style={{ width: `${(row.newMrr / maxMrr) * 100}%` }}
                    />
                    <span
                      className={`relative flex items-center gap-2 truncate px-2 py-1.5 ${unidentified ? "text-muted-foreground italic" : by === "source" ? "" : "font-mono"}`}
                    >
                      {iconDimension && !unidentified ? (
                        <DimensionIcon
                          dimension={iconDimension}
                          value={row.key}
                        />
                      ) : null}
                      <span className="truncate">
                        {unidentified ? "not identified" : row.key || "(none)"}
                      </span>
                    </span>
                  </TableCell>
                  <TableCell
                    className={`${cellClass} hidden text-muted-foreground md:table-cell`}
                  >
                    {visitors === undefined ? "—" : visitors.toLocaleString()}
                  </TableCell>
                  <TableCell
                    className={`${cellClass} hidden text-muted-foreground sm:table-cell`}
                  >
                    {unidentified ? "—" : row.signups}
                  </TableCell>
                  <TableCell className={cellClass}>{row.customers}</TableCell>
                  <TableCell
                    className={`${cellClass} hidden text-muted-foreground md:table-cell`}
                  >
                    {visitors === undefined
                      ? "—"
                      : rate(row.customers, visitors)}
                  </TableCell>
                  <TableCell
                    className={`${cellClass} hidden text-muted-foreground xl:table-cell`}
                  >
                    {row.revenue > 0 ? money(row.revenue) : "—"}
                  </TableCell>
                  <TableCell
                    className={`${cellClass} hidden text-muted-foreground xl:table-cell`}
                  >
                    {row.ltv === null ? "—" : money(row.ltv)}
                  </TableCell>
                  <TableCell
                    className={`${cellClass} hidden text-muted-foreground lg:table-cell`}
                  >
                    {daysLabel(row.daysToPay)}
                  </TableCell>
                  <TableCell className={`${cellClass} font-medium`}>
                    {money(row.newMrr)}
                  </TableCell>
                </TableRow>
              )
            })
          )}
        </TableBody>
      </Table>
      <p className="mt-3 px-2 text-xs leading-relaxed text-muted-foreground">
        {overview.identifiedCustomers} of {overview.payingCustomers} paying
        customers are linked to a signup. Visitors count every visit in the
        range; signups and customers count by signup and first payment date.
      </p>
    </Panel>
  )
}

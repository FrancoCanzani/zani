import { Area, AreaChart } from "recharts"

import {
  formatCompactMoney,
  formatMoney,
  type RevenueOverview,
} from "@features/revenue/api"

import { changePercent, type SiteStats } from "./api"
import { metricLabels, type Metric } from "./search"

type Kpi = {
  metric: Metric
  value: string
  delta: number | null
  invert?: boolean
  hint: string
  series: number[]
}

function DeltaBadge({ value, invert }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0
  const bad = invert ? value > 0 : value < 0
  return (
    <span
      className={`rounded-full px-1.5 py-0.5 font-mono text-[11px] font-medium tabular-nums ${
        good
          ? "bg-emerald-500/10 text-emerald-700"
          : bad
            ? "bg-red-500/10 text-red-700"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {value > 0 ? "+" : ""}
      {value}%
    </span>
  )
}

function Sparkline({ values, accent }: { values: number[]; accent: boolean }) {
  if (values.length < 2 || values.every((value) => value === 0)) return null
  const data = values.map((value, index) => ({ index, value }))
  const color = accent ? "var(--color-emerald-600)" : "var(--foreground)"
  return (
    <AreaChart
      width={120}
      height={28}
      data={data}
      margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
      className="pointer-events-none !absolute right-3 bottom-3 opacity-70"
    >
      <Area
        dataKey="value"
        type="monotone"
        stroke={color}
        strokeWidth={1.25}
        fill={color}
        fillOpacity={0.08}
        isAnimationActive={false}
        dot={false}
      />
    </AreaChart>
  )
}

const revenueMetrics = new Set<Metric>(["signups", "new_mrr", "mrr"])

function percent(part: number, whole: number) {
  if (whole <= 0) return "0%"
  const value = (part / whole) * 100
  return `${value < 10 ? value.toFixed(1) : Math.round(value)}%`
}

export function KpiCards({
  totals,
  previousTotals,
  revenue,
  previousRevenue,
  selected,
  onSelect,
}: {
  totals: SiteStats
  previousTotals: SiteStats
  revenue: RevenueOverview
  previousRevenue: RevenueOverview
  selected: Metric
  onSelect: (metric: Metric) => void
}) {
  const currency = revenue.currency
  const trafficSeries = (key: "visitors" | "views") =>
    totals.points.map((point) => point[key])
  const perVisitor =
    totals.visitors > 0 ? Math.round(revenue.newMrr / totals.visitors) : 0

  const kpis: Kpi[] = [
    {
      metric: "visitors",
      value: totals.visitors.toLocaleString(),
      delta: changePercent(totals.visitors, previousTotals.visitors),
      hint: `${totals.sessions.toLocaleString()} visits`,
      series: trafficSeries("visitors"),
    },
    {
      metric: "views",
      value: totals.views.toLocaleString(),
      delta: changePercent(totals.views, previousTotals.views),
      hint: `${totals.viewsPerVisit} per visit`,
      series: trafficSeries("views"),
    },
    {
      metric: "bounce",
      value: `${totals.bounceRate}%`,
      delta: changePercent(totals.bounceRate, previousTotals.bounceRate),
      invert: true,
      hint: "left after one page",
      series: [],
    },
    {
      metric: "signups",
      value: revenue.signups.toLocaleString(),
      delta: changePercent(revenue.signups, previousRevenue.signups),
      hint: `${percent(revenue.signups, totals.visitors)} of visitors`,
      series: revenue.points.map((point) => point.signups),
    },
    {
      metric: "new_mrr",
      value: formatCompactMoney(revenue.newMrr, currency),
      delta: changePercent(revenue.newMrr, previousRevenue.newMrr),
      hint: `${formatMoney(perVisitor, currency)} per visitor`,
      series: revenue.points.map((point) => point.newMrr),
    },
    {
      metric: "mrr",
      value: formatCompactMoney(revenue.mrr, currency),
      delta:
        revenue.mrrStart > 0
          ? changePercent(revenue.mrr, revenue.mrrStart)
          : null,
      hint: `${revenue.payingCustomers} paying · ${formatCompactMoney(revenue.arpa, currency)} avg`,
      series: revenue.points.map((point) => point.mrr),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => {
        const active = selected === kpi.metric
        const accent = revenueMetrics.has(kpi.metric)
        return (
          <button
            key={kpi.metric}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kpi.metric)}
            className={`relative min-w-0 overflow-hidden rounded-xl border bg-card px-3 pt-3 pb-9 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              active
                ? "border-foreground/40 ring-1 ring-foreground/10"
                : "border-border/70 hover:border-foreground/20 hover:bg-muted/30"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {accent ? (
                <span
                  aria-hidden
                  className="size-1.5 rounded-full bg-emerald-600"
                />
              ) : null}
              {metricLabels[kpi.metric]}
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-2xl font-medium tracking-tight tabular-nums">
                {kpi.value}
              </span>
              {kpi.delta === null ? null : (
                <DeltaBadge value={kpi.delta} invert={kpi.invert} />
              )}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {kpi.hint}
            </div>
            <Sparkline values={kpi.series} accent={accent} />
          </button>
        )
      })}
    </div>
  )
}

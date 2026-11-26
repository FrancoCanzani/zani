import { changePercent } from "@features/sites/api"
import {
  metricLabels,
  type RevenueChartMetric,
} from "@features/sites/search"

import {
  formatCompactMoney,
  type RevenueOverview,
} from "./api"

type Kpi = {
  key: string
  label: string
  value: string
  delta: number | null
  invert?: boolean
  metric?: RevenueChartMetric
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

export function RevenueKpiCards({
  overview,
  previous,
  selected,
  onSelect,
}: {
  overview: RevenueOverview
  previous: RevenueOverview
  selected: RevenueChartMetric
  onSelect: (metric: RevenueChartMetric) => void
}) {
  const currency = overview.currency
  const kpis: Kpi[] = [
    {
      key: "mrr",
      label: metricLabels.mrr,
      value: formatCompactMoney(overview.mrr, currency),
      delta:
        overview.mrrStart > 0
          ? changePercent(overview.mrr, overview.mrrStart)
          : changePercent(overview.mrr, previous.mrr),
      metric: "mrr",
    },
    {
      key: "arr",
      label: "ARR",
      value: formatCompactMoney(overview.mrr * 12, currency),
      delta:
        overview.mrrStart > 0
          ? changePercent(overview.mrr * 12, overview.mrrStart * 12)
          : changePercent(overview.mrr * 12, previous.mrr * 12),
    },
    {
      key: "net_new",
      label: "Net new MRR",
      value: formatCompactMoney(overview.netNewMrr, currency),
      delta: changePercent(overview.netNewMrr, previous.netNewMrr),
    },
    {
      key: "new_mrr",
      label: metricLabels.new_mrr,
      value: formatCompactMoney(overview.newMrr, currency),
      delta: changePercent(overview.newMrr, previous.newMrr),
      metric: "new_mrr",
    },
    {
      key: "churn",
      label: "Revenue churn",
      value:
        overview.mrrStart > 0 ? `${overview.revenueChurnRate}%` : "—",
      delta:
        previous.mrrStart > 0
          ? changePercent(
              overview.revenueChurnRate,
              previous.revenueChurnRate
            )
          : null,
      invert: true,
    },
    {
      key: "customers",
      label: "Customers",
      value: overview.payingCustomers.toLocaleString(),
      delta: changePercent(
        overview.payingCustomers,
        previous.payingCustomers
      ),
    },
    {
      key: "arpa",
      label: "ARPU",
      value: formatCompactMoney(overview.arpa, currency),
      delta: changePercent(overview.arpa, previous.arpa),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
      {kpis.map((kpi) => {
        const selectable = kpi.metric !== undefined
        const active = selectable && selected === kpi.metric
        const className = `relative min-w-0 overflow-hidden rounded-xl border bg-card px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
          active
            ? "border-foreground/40 ring-1 ring-foreground/10"
            : "border-border/70"
        } ${selectable ? "hover:border-foreground/20 hover:bg-muted/30" : ""}`

        const body = (
          <>
            <div className="text-[13px] text-muted-foreground">{kpi.label}</div>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-mono text-2xl font-medium tracking-tight tabular-nums">
                {kpi.value}
              </span>
              {kpi.delta === null ? null : (
                <DeltaBadge value={kpi.delta} invert={kpi.invert} />
              )}
            </div>
          </>
        )

        if (!selectable || !kpi.metric) {
          return (
            <div key={kpi.key} className={className}>
              {body}
            </div>
          )
        }

        const metric = kpi.metric
        return (
          <button
            key={kpi.key}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(metric)}
            className={className}
          >
            {body}
          </button>
        )
      })}
    </div>
  )
}

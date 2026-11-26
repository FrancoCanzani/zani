import { changePercent } from "@features/sites/api"

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
}: {
  overview: RevenueOverview
  previous: RevenueOverview
}) {
  const currency = overview.currency
  const kpis: Kpi[] = [
    {
      key: "mrr",
      label: "MRR",
      value: formatCompactMoney(overview.mrr, currency),
      delta:
        overview.mrrStart > 0
          ? changePercent(overview.mrr, overview.mrrStart)
          : changePercent(overview.mrr, previous.mrr),
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
  ]

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          className="min-w-0 rounded-xl border border-border/70 bg-card px-3 py-3"
        >
          <div className="text-[13px] text-muted-foreground">{kpi.label}</div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="font-mono text-2xl font-medium tracking-tight tabular-nums">
              {kpi.value}
            </span>
            {kpi.delta === null ? null : (
              <DeltaBadge value={kpi.delta} invert={kpi.invert} />
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

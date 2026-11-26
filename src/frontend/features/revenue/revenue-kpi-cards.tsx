import { changePercent } from "@features/sites/api"

import { formatCompactMoney, type RevenueOverview } from "./api"

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
      className={`font-mono text-[12px] tabular-nums ${
        good
          ? "text-emerald-700"
          : bad
            ? "text-red-700"
            : "text-muted-foreground"
      }`}
    >
      {value > 0 ? "↑" : value < 0 ? "↓" : ""}
      {Math.abs(value)}%
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
      value: overview.mrrStart > 0 ? `${overview.revenueChurnRate}%` : "—",
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
    <div className="flex flex-wrap gap-1 p-1.5">
      {kpis.map((kpi) => (
        <div
          key={kpi.key}
          className="min-w-[7rem] flex-1 rounded-lg px-2.5 py-1.5"
        >
          <div className="text-[11px] text-muted-foreground">{kpi.label}</div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-xl font-medium tracking-tight tabular-nums">
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

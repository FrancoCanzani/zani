import { changePercent, type SiteStats } from "./api"
import { metricLabels, type TrafficMetric } from "./search"

type Kpi = {
  metric: TrafficMetric
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

export function KpiCards({
  totals,
  previousTotals,
  selected,
  onSelect,
}: {
  totals: SiteStats
  previousTotals: SiteStats
  selected: TrafficMetric
  onSelect: (metric: TrafficMetric) => void
}) {
  const kpis: Kpi[] = [
    {
      metric: "visitors",
      value: totals.visitors.toLocaleString(),
      delta: changePercent(totals.visitors, previousTotals.visitors),
    },
    {
      metric: "views",
      value: totals.views.toLocaleString(),
      delta: changePercent(totals.views, previousTotals.views),
    },
    {
      metric: "bounce",
      value: `${totals.bounceRate}%`,
      delta: changePercent(totals.bounceRate, previousTotals.bounceRate),
      invert: true,
    },
  ]

  return (
    <div className="flex flex-wrap gap-1 p-1.5">
      {kpis.map((kpi) => {
        const active = selected === kpi.metric
        return (
          <button
            key={kpi.metric}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kpi.metric)}
            className={`min-w-[7rem] flex-1 rounded-lg px-2.5 py-1.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              active ? "bg-muted/70" : "hover:bg-muted/40"
            }`}
          >
            <div className="text-[11px] text-muted-foreground">
              {metricLabels[kpi.metric]}
            </div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-mono text-xl font-medium tracking-tight tabular-nums">
                {kpi.value}
              </span>
              {kpi.delta === null ? null : (
                <DeltaBadge value={kpi.delta} invert={kpi.invert} />
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

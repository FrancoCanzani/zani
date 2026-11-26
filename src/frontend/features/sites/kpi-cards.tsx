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
    <div className="grid grid-cols-3 gap-2">
      {kpis.map((kpi) => {
        const active = selected === kpi.metric
        return (
          <button
            key={kpi.metric}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kpi.metric)}
            className={`relative min-w-0 overflow-hidden rounded-xl border bg-card px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
              active
                ? "border-foreground/40 ring-1 ring-foreground/10"
                : "border-border/70 hover:border-foreground/20 hover:bg-muted/30"
            }`}
          >
            <div className="text-[13px] text-muted-foreground">
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
          </button>
        )
      })}
    </div>
  )
}

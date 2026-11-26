import { changePercent, type SiteStats } from "./api"
import { metricLabels, type TrafficMetric } from "./search"

const trafficAccent = "#3B82F6"

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
      metric: "views",
      value: totals.views.toLocaleString(),
      delta: changePercent(totals.views, previousTotals.views),
    },
    {
      metric: "sessions",
      value: totals.sessions.toLocaleString(),
      delta: changePercent(totals.sessions, previousTotals.sessions),
    },
    {
      metric: "visitors",
      value: totals.visitors.toLocaleString(),
      delta: changePercent(totals.visitors, previousTotals.visitors),
    },
    {
      metric: "bounce",
      value: `${totals.bounceRate}%`,
      delta: changePercent(totals.bounceRate, previousTotals.bounceRate),
      invert: true,
    },
  ]

  return (
    <div className="flex flex-wrap gap-x-1 px-2 pt-2">
      {kpis.map((kpi) => {
        const active = selected === kpi.metric
        return (
          <button
            key={kpi.metric}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(kpi.metric)}
            className="relative min-w-[7rem] flex-1 px-2.5 pt-1.5 pb-2.5 text-left transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">
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
            {active ? (
              <span
                aria-hidden
                className="absolute inset-x-2 bottom-0 h-0.5 rounded-full"
                style={{ backgroundColor: trafficAccent }}
              />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

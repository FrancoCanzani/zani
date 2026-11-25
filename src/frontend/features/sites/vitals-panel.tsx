import { useSuspenseQuery } from "@tanstack/react-query"

import {
  siteVitalsQueryOptions,
  type StatsFilters,
  type StatsRange,
  type VitalSummary,
} from "./api"
import {
  vitalMetricLabels,
  vitalMetrics,
  vitalThresholdLabels,
  type VitalMetric,
} from "./search"

function formatP75(metric: VitalMetric, value: number | null) {
  if (value === null) return "—"
  if (metric === "cls") return value.toFixed(2)
  if (value >= 1000) return `${(value / 1000).toFixed(2)}s`
  return `${Math.round(value)}ms`
}

function ratingShare(summary: VitalSummary) {
  const total = summary.good + summary.needsImprovement + summary.poor
  if (total === 0) {
    return { good: 0, needsImprovement: 0, poor: 0 }
  }
  return {
    good: summary.good / total,
    needsImprovement: summary.needsImprovement / total,
    poor: summary.poor / total,
  }
}

function RatingBar({
  good,
  needsImprovement,
  poor,
  className,
}: {
  good: number
  needsImprovement: number
  poor: number
  className?: string
}) {
  return (
    <div
      className={`flex h-2 overflow-hidden rounded-full bg-muted ${className ?? ""}`}
    >
      <span className="bg-emerald-600" style={{ width: `${good * 100}%` }} />
      <span
        className="bg-amber-500"
        style={{ width: `${needsImprovement * 100}%` }}
      />
      <span className="bg-red-600" style={{ width: `${poor * 100}%` }} />
    </div>
  )
}

function RatingLegend({ metric }: { metric: VitalMetric }) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-emerald-600" />
          Good
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-amber-500" />
          Needs improvement
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-red-600" />
          Poor
        </span>
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {vitalThresholdLabels[metric]}
      </p>
    </div>
  )
}

export function VitalsPanel({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  metric,
  activePath,
  onSelectMetric,
  onSelectPath,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  metric: VitalMetric
  activePath: string | undefined
  onSelectMetric: (metric: VitalMetric) => void
  onSelectPath: (path: string) => void
}) {
  const { data } = useSuspenseQuery(
    siteVitalsQueryOptions(slug, siteId, range, filters, includeBots, metric)
  )

  const byMetric = new Map(data.metrics.map((row) => [row.metric, row]))
  const cards = vitalMetrics.map(
    (key) =>
      byMetric.get(key) ?? {
        metric: key,
        samples: 0,
        p75: null,
        good: 0,
        needsImprovement: 0,
        poor: 0,
      }
  )
  const hasSamples = cards.some((card) => card.samples > 0)
  const selected = byMetric.get(metric) ?? cards.find((c) => c.metric === metric)!

  if (!hasSamples) {
    return (
      <section className="space-y-2">
        <h2 className="text-sm text-muted-foreground">No vitals yet</h2>
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Hard page loads with the script installed send LCP, INP, CLS, and
          load. Soft SPA navigations do not.
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <RatingLegend metric={metric} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const active = card.metric === metric
          const share = ratingShare(card)
          return (
            <button
              key={card.metric}
              type="button"
              onClick={() => onSelectMetric(card.metric)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${active ? "border-foreground/30 bg-muted/50" : "border-border/80 hover:bg-muted/30"}`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  {vitalMetricLabels[card.metric]}
                </div>
                <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                  {card.samples} samples
                </div>
              </div>
              <div className="mt-1 font-mono text-3xl font-medium tracking-tight tabular-nums">
                {formatP75(card.metric, card.p75)}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">
                P75
              </div>
              <RatingBar
                className="mt-3"
                good={share.good}
                needsImprovement={share.needsImprovement}
                poor={share.poor}
              />
              <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted-foreground tabular-nums">
                <span>{Math.round(share.good * 100)}% good</span>
                <span>{Math.round(share.poor * 100)}% poor</span>
              </div>
            </button>
          )
        })}
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold tracking-tight">
            By path · {vitalMetricLabels[metric]}
          </h2>
          <p className="font-mono text-xs text-muted-foreground tabular-nums">
            {selected.samples} samples · P75 {formatP75(metric, selected.p75)}
          </p>
        </div>

        <ul className="space-y-2">
          {data.paths.length === 0 ? (
            <li className="py-2 text-xs text-muted-foreground">No paths</li>
          ) : (
            data.paths.map((row) => {
              const active = activePath === row.path
              const share = ratingShare({
                metric,
                samples: row.samples,
                p75: row.p75,
                good: row.good,
                needsImprovement: row.needsImprovement,
                poor: row.poor,
              })
              return (
                <li key={row.path}>
                  <button
                    type="button"
                    onClick={() => onSelectPath(row.path)}
                    className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${active ? "border-foreground/30 bg-muted/40" : "border-border/70 hover:bg-muted/30"}`}
                  >
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 truncate font-mono text-[13px]">
                        {row.path || "(none)"}
                      </span>
                      <div className="flex shrink-0 items-baseline gap-3 font-mono text-[13px] tabular-nums">
                        <span className="font-medium">
                          {formatP75(metric, row.p75)}
                          <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                            P75
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          {row.samples}
                          <span className="ml-1 text-[11px]">samples</span>
                        </span>
                      </div>
                    </div>
                    <RatingBar
                      className="mt-2"
                      good={share.good}
                      needsImprovement={share.needsImprovement}
                      poor={share.poor}
                    />
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                      <span>{Math.round(share.good * 100)}% good</span>
                      <span>
                        {Math.round(share.needsImprovement * 100)}% needs
                        improvement
                      </span>
                      <span>{Math.round(share.poor * 100)}% poor</span>
                    </div>
                  </button>
                </li>
              )
            })
          )}
        </ul>
        {data.truncated ? (
          <p className="text-xs text-muted-foreground">
            Sample set truncated for this range.
          </p>
        ) : null}
      </section>
    </div>
  )
}

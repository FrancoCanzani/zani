import { useSuspenseQuery } from "@tanstack/react-query"
import { useState } from "react"

import {
  siteVitalsQueryOptions,
  type StatsFilters,
  type StatsRange,
  type VitalMetric,
  type VitalSummary,
} from "./api"

const metricOrder = ["lcp", "inp", "cls", "load"] as const satisfies readonly VitalMetric[]

const metricLabels: Record<VitalMetric, string> = {
  lcp: "LCP",
  inp: "INP",
  cls: "CLS",
  load: "Load",
}

const metricHints: Record<VitalMetric, string> = {
  lcp: "Largest contentful paint",
  inp: "Interaction to next paint",
  cls: "Cumulative layout shift",
  load: "Page load time",
}

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

export function VitalsPanel({
  slug,
  siteId,
  range,
  filters,
  includeBots,
  activePath,
  onSelectPath,
}: {
  slug: string
  siteId: string
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  activePath: string | undefined
  onSelectPath: (path: string) => void
}) {
  const [metric, setMetric] = useState<VitalMetric>("lcp")
  const { data } = useSuspenseQuery(
    siteVitalsQueryOptions(slug, siteId, range, filters, includeBots, metric)
  )

  const byMetric = new Map(data.metrics.map((row) => [row.metric, row]))
  const cards = metricOrder.map(
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

  if (!hasSamples) {
    return (
      <section className="rounded-lg border border-border/70 p-4">
        <h2 className="text-[15px] font-semibold tracking-tight">Web vitals</h2>
        <p className="mt-2 text-xs text-muted-foreground">
          No vitals yet. They arrive after a hard page load with the script
          installed.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-3 rounded-lg border border-border/70 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">Web vitals</h2>
        <p className="text-xs text-muted-foreground">P75 · hard navigations</p>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cards.map((card) => {
          const selected = card.metric === metric
          const share = ratingShare(card)
          return (
            <button
              key={card.metric}
              type="button"
              onClick={() => setMetric(card.metric)}
              className={`rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? "border-foreground/30 bg-muted/50" : "border-border/80 hover:bg-muted/30"}`}
            >
              <div className="text-sm text-muted-foreground">
                {metricLabels[card.metric]}
              </div>
              <div className="mt-1 font-mono text-2xl font-medium tracking-tight tabular-nums">
                {formatP75(card.metric, card.p75)}
              </div>
              <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="bg-emerald-600"
                  style={{ width: `${share.good * 100}%` }}
                />
                <span
                  className="bg-amber-500"
                  style={{ width: `${share.needsImprovement * 100}%` }}
                />
                <span
                  className="bg-red-600"
                  style={{ width: `${share.poor * 100}%` }}
                />
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground">
                {metricHints[card.metric]}
              </div>
            </button>
          )
        })}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            By path · {metricLabels[metric]}
          </h3>
          {data.truncated ? (
            <span className="text-[11px] text-muted-foreground">Truncated</span>
          ) : null}
        </div>
        <ul className="space-y-1.5">
          {data.paths.length === 0 ? (
            <li className="py-2 text-xs text-muted-foreground">No paths</li>
          ) : (
            data.paths.map((row) => {
              const selected = activePath === row.path
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
                    className={`relative flex h-[30px] w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted/60 ${selected ? "bg-muted/60" : ""}`}
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 flex"
                      style={{ width: "40%" }}
                    >
                      <span
                        className="h-full bg-emerald-500/20"
                        style={{ width: `${share.good * 100}%` }}
                      />
                      <span
                        className="h-full bg-amber-500/20"
                        style={{ width: `${share.needsImprovement * 100}%` }}
                      />
                      <span
                        className="h-full bg-red-500/20"
                        style={{ width: `${share.poor * 100}%` }}
                      />
                    </span>
                    <span className="relative min-w-0 flex-1 truncate font-mono">
                      {row.path || "(none)"}
                    </span>
                    <span className="relative font-mono text-[13px] text-muted-foreground tabular-nums">
                      {formatP75(metric, row.p75)}
                    </span>
                    <span className="relative w-10 text-right font-mono text-[13px] text-muted-foreground tabular-nums">
                      {row.samples}
                    </span>
                  </button>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </section>
  )
}

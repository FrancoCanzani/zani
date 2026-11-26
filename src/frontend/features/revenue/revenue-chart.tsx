import { useMemo } from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import { Segmented } from "@components/segmented"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@components/ui/chart"
import {
  dayMs,
  hourMs,
  metricLabels,
  zonedOffsetMs,
  type Grain,
  type RevenueChartMetric,
} from "@features/sites/search"
import type { StatsRange } from "@features/sites/api"

import {
  formatCompactMoney,
  formatMoney,
  type RevenuePoint,
} from "./api"

const chartMetrics = ["mrr", "new_mrr"] as const satisfies RevenueChartMetric[]
const chartMetricLabels: Record<RevenueChartMetric, string> = {
  mrr: "MRR",
  new_mrr: "New MRR",
}

function bucketSize(grain: Grain) {
  switch (grain) {
    case "minute":
      return 60_000
    case "hour":
      return hourMs
    case "day":
      return dayMs
    case "week":
      return 7 * dayMs
    default: {
      const exhaustive: never = grain
      return exhaustive
    }
  }
}

function formatTick(ms: number, grain: Grain, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    ...(grain === "minute"
      ? { hour: "numeric", minute: "2-digit" }
      : grain === "hour"
        ? { hour: "numeric" }
        : { month: "short", day: "numeric" }),
  }).format(ms)
}

function formatBucket(ms: number, grain: Grain, timeZone: string) {
  const format = (value: number, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(value)
  switch (grain) {
    case "minute":
      return format(ms, { hour: "numeric", minute: "2-digit" })
    case "hour":
      return format(ms, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
      })
    case "day":
      return format(ms, { weekday: "short", month: "short", day: "numeric" })
    case "week":
      return `Week of ${format(ms, { month: "short", day: "numeric", year: "numeric" })}`
    default: {
      const exhaustive: never = grain
      return exhaustive
    }
  }
}

type ChartRow = {
  bucket: number
  value: number | null
  newMrr: number
  newCustomers: number
  signups: number
  mrr: number
  partial: boolean
}

export function RevenueChart({
  points,
  range,
  metric,
  currency,
  timeZone,
  onMetricChange,
}: {
  points: RevenuePoint[]
  range: StatsRange
  metric: RevenueChartMetric
  currency: string
  timeZone: string
  onMetricChange: (metric: RevenueChartMetric) => void
}) {
  const grain = range.grain
  const rows = useMemo<ChartRow[]>(() => {
    const size = bucketSize(grain)
    const offset = zonedOffsetMs(Date.now(), timeZone)
    const bucketOf = (ms: number) =>
      Math.floor((ms + offset) / size) * size - offset
    const startMs = Date.parse(range.start)
    const endMs = Date.parse(range.end)
    const byBucket = new Map(points.map((point) => [point.bucket, point]))
    const now = Date.now()
    const result: ChartRow[] = []
    let lastMrr = 0
    for (let bucket = bucketOf(startMs); bucket < endMs; bucket += size) {
      const point = byBucket.get(bucket)
      if (point) lastMrr = point.mrr
      const mrr = point ? point.mrr : lastMrr
      const newMrr = point?.newMrr ?? 0
      result.push({
        bucket,
        value: bucket > now ? null : metric === "mrr" ? mrr : newMrr,
        newMrr,
        newCustomers: point?.newCustomers ?? 0,
        signups: point?.signups ?? 0,
        mrr,
        partial: bucket + size > now,
      })
    }
    return result
  }, [points, range.start, range.end, grain, metric, timeZone])

  const label = metricLabels[metric]
  const chartConfig = {
    value: { label, color: "var(--color-emerald-600)" },
  } satisfies ChartConfig

  const tickCount = Math.min(7, Math.max(2, rows.length))
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const rowIndex = Math.round((index / (tickCount - 1)) * (rows.length - 1))
    return rows[rowIndex]?.bucket ?? 0
  })

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden
            className={
              metric === "mrr"
                ? "h-0.5 w-3 rounded-full bg-emerald-600"
                : "size-2.5 rounded-[3px] bg-emerald-600"
            }
          />
          {label}
        </span>
        <Segmented
          label="Chart metric"
          options={chartMetrics}
          value={metric}
          labels={chartMetricLabels}
          onChange={onMetricChange}
        />
      </div>
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-72 w-full [&_.recharts-cartesian-axis-tick_text]:font-mono"
        initialDimension={{ width: 960, height: 288 }}
      >
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 0, left: 0, bottom: 0 }}
          barCategoryGap={rows.length > 60 ? 1 : "14%"}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="bucket"
            ticks={ticks}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            interval="preserveStartEnd"
            tickFormatter={(value) =>
              formatTick(Number(value), grain, timeZone)
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width="auto"
            allowDecimals={false}
            tickFormatter={(value) =>
              formatCompactMoney(Number(value), currency)
            }
          />
          <ChartTooltip
            cursor={{ fill: "var(--muted)", opacity: 0.6 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as ChartRow | undefined
              if (!active || !row) return null
              return (
                <div className="min-w-48 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
                  <p className="mb-1.5 font-medium text-foreground">
                    {formatBucket(row.bucket, grain, timeZone)}
                    {row.partial ? (
                      <span className="ml-1 font-normal text-muted-foreground">
                        (so far)
                      </span>
                    ) : null}
                  </p>
                  <dl className="space-y-1 font-mono tabular-nums">
                    <TooltipRow
                      label="Signups"
                      value={String(row.signups)}
                    />
                    <TooltipRow
                      label="New customers"
                      value={String(row.newCustomers)}
                    />
                    <TooltipRow
                      label="New MRR"
                      value={formatMoney(row.newMrr, currency)}
                      accent
                    />
                    <TooltipRow
                      label="MRR"
                      value={formatMoney(row.mrr, currency)}
                    />
                  </dl>
                </div>
              )
            }}
          />
          {metric === "new_mrr" ? (
            <Bar
              dataKey="value"
              fill="var(--color-value)"
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
              maxBarSize={18}
              isAnimationActive={false}
            />
          ) : (
            <Line
              dataKey="value"
              type="stepAfter"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 3.5,
                strokeWidth: 2,
                stroke: "var(--color-value)",
                fill: "var(--background)",
              }}
              connectNulls={false}
              isAnimationActive={false}
            />
          )}
        </ComposedChart>
      </ChartContainer>
    </section>
  )
}

function TooltipRow({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-sans text-muted-foreground">{label}</dt>
      <dd className={accent ? "text-emerald-700" : "text-foreground"}>
        {value}
      </dd>
    </div>
  )
}

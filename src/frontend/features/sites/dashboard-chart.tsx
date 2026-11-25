import { useMemo } from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@components/ui/chart"

import {
  formatCompactMoney,
  formatMoney,
  type RevenuePoint,
} from "@features/revenue/api"

import type { StatsPoint, StatsRange } from "./api"
import {
  metricLabels,
  zonedOffsetMs,
  type Grain,
  type RevenueMetric,
  type TrafficMetric,
} from "./search"

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

function bucketSize(grain: Grain) {
  switch (grain) {
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
    ...(grain === "hour"
      ? { hour: "numeric" }
      : { month: "short", day: "numeric" }),
  }).format(ms)
}

function formatBucket(ms: number, grain: Grain, timeZone: string) {
  const format = (value: number, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(value)
  switch (grain) {
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

function formatCount(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

function revenueValue(point: RevenuePoint | undefined, metric: RevenueMetric) {
  if (!point) return 0
  switch (metric) {
    case "signups":
      return point.signups
    case "new_mrr":
      return point.newMrr
    case "mrr":
      return point.mrr
    default: {
      const exhaustive: never = metric
      return exhaustive
    }
  }
}

type ChartRow = {
  bucket: number
  bars: number
  previous: number | null
  line: number | null
  partial: boolean
  revenue: RevenuePoint | undefined
}

export function DashboardChart({
  points,
  previousPoints,
  revenuePoints,
  range,
  bars,
  line,
  currency,
  showRevenue,
  compare,
  timeZone,
}: {
  points: StatsPoint[]
  previousPoints: StatsPoint[]
  revenuePoints: RevenuePoint[]
  range: StatsRange
  bars: TrafficMetric
  line: RevenueMetric
  currency: string
  showRevenue: boolean
  compare: boolean
  timeZone: string
}) {
  const grain = range.grain
  const rows = useMemo<ChartRow[]>(() => {
    const size = bucketSize(grain)
    const offset = zonedOffsetMs(Date.now(), timeZone)
    const bucketOf = (ms: number) =>
      Math.floor((ms + offset) / size) * size - offset
    const startMs = Date.parse(range.start)
    const endMs = Date.parse(range.end)
    const traffic = new Map(
      points
        .filter((point) => point.bucket !== null)
        .map((point) => [point.bucket as number, point[bars]])
    )
    const previousByBucket = new Map(
      previousPoints
        .filter((point) => point.bucket !== null)
        .map((point) => [point.bucket as number, point[bars]])
    )
    const firstPrevious = bucketOf(startMs - (endMs - startMs))
    const revenue = new Map(revenuePoints.map((point) => [point.bucket, point]))
    const now = Date.now()
    const result: ChartRow[] = []
    let lastMrr = 0
    for (
      let bucket = bucketOf(startMs), index = 0;
      bucket < endMs;
      bucket += size, index += 1
    ) {
      const revenuePoint = revenue.get(bucket)
      if (revenuePoint) lastMrr = revenuePoint.mrr
      const value =
        line === "mrr"
          ? revenuePoint
            ? revenuePoint.mrr
            : lastMrr
          : revenueValue(revenuePoint, line)
      result.push({
        bucket,
        bars: traffic.get(bucket) ?? 0,
        previous: compare
          ? (previousByBucket.get(firstPrevious + index * size) ?? 0)
          : null,
        line: bucket > now ? null : value,
        partial: bucket + size > now,
        revenue: revenuePoint,
      })
    }
    return result
  }, [
    points,
    previousPoints,
    revenuePoints,
    range.start,
    range.end,
    grain,
    bars,
    line,
    compare,
    timeZone,
  ])

  const money = line !== "signups"
  const barLabel = metricLabels[bars]
  const lineLabel = metricLabels[line]
  const chartConfig = {
    bars: { label: barLabel, color: "var(--foreground)" },
    previous: {
      label: `Previous ${barLabel.toLowerCase()}`,
      color: "var(--chart-2)",
    },
    line: { label: lineLabel, color: "var(--color-emerald-600)" },
  } satisfies ChartConfig

  const tickCount = Math.min(7, Math.max(2, rows.length))
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const rowIndex = Math.round((index / (tickCount - 1)) * (rows.length - 1))
    return rows[rowIndex]?.bucket ?? 0
  })

  return (
    <section className="rounded-xl border border-border/70 bg-card p-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-[3px] bg-foreground/80"
          />
          {barLabel}
        </span>
        {compare ? (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0 w-3 border-t border-dashed border-muted-foreground"
            />
            Previous period
          </span>
        ) : null}
        {showRevenue ? (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={
                line === "mrr"
                  ? "h-0.5 w-3 rounded-full bg-emerald-600"
                  : "size-2.5 rounded-[3px] bg-emerald-600"
              }
            />
            {lineLabel}
          </span>
        ) : null}
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
          barGap={1}
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
            yAxisId="traffic"
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width={40}
            allowDecimals={false}
            tickFormatter={(value) => formatCount(Number(value))}
          />
          {showRevenue ? (
            <YAxis
              yAxisId="revenue"
              orientation="right"
              tickLine={false}
              axisLine={false}
              tickMargin={6}
              width={money ? 56 : 32}
              allowDecimals={false}
              tickFormatter={(value) =>
                money
                  ? formatCompactMoney(Number(value), currency)
                  : formatCount(Number(value))
              }
            />
          ) : null}
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
                      label={barLabel}
                      value={row.bars.toLocaleString()}
                    />
                    {compare && row.previous !== null ? (
                      <TooltipRow
                        label="Previous"
                        value={row.previous.toLocaleString()}
                        muted
                      />
                    ) : null}
                    {showRevenue ? (
                      <>
                        <TooltipRow
                          label="Signups"
                          value={String(row.revenue?.signups ?? 0)}
                        />
                        <TooltipRow
                          label="New customers"
                          value={String(row.revenue?.newCustomers ?? 0)}
                        />
                        <TooltipRow
                          label="New MRR"
                          value={formatMoney(
                            row.revenue?.newMrr ?? 0,
                            currency
                          )}
                          accent
                        />
                        <TooltipRow
                          label="MRR"
                          value={formatMoney(row.revenue?.mrr ?? 0, currency)}
                        />
                      </>
                    ) : null}
                  </dl>
                </div>
              )
            }}
          />
          {compare ? (
            <Line
              yAxisId="traffic"
              dataKey="previous"
              type="monotone"
              stroke="var(--color-previous)"
              strokeWidth={1.25}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ) : null}
          <Bar
            yAxisId="traffic"
            dataKey="bars"
            fill="var(--color-bars)"
            fillOpacity={0.14}
            radius={[3, 3, 0, 0]}
            isAnimationActive={false}
            shape={(props: unknown) => {
              const { x, y, width, height, payload } = props as {
                x: number
                y: number
                width: number
                height: number
                payload: ChartRow
              }
              return (
                <rect
                  x={x}
                  y={y}
                  width={Math.max(0, width)}
                  height={Math.max(0, height)}
                  rx={Math.min(3, width / 2)}
                  fill="var(--color-bars)"
                  fillOpacity={payload.partial ? 0.07 : 0.16}
                />
              )
            }}
            activeBar={{ fillOpacity: 0.3 }}
          />
          {showRevenue && line !== "mrr" ? (
            <Bar
              yAxisId="revenue"
              dataKey="line"
              fill="var(--color-line)"
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
              maxBarSize={14}
              isAnimationActive={false}
            />
          ) : null}
          {showRevenue && line === "mrr" ? (
            <Line
              yAxisId="revenue"
              dataKey="line"
              type="stepAfter"
              stroke="var(--color-line)"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 3.5,
                strokeWidth: 2,
                stroke: "var(--color-line)",
                fill: "var(--background)",
              }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ) : null}
        </ComposedChart>
      </ChartContainer>
    </section>
  )
}

function TooltipRow({
  label,
  value,
  muted,
  accent,
}: {
  label: string
  value: string
  muted?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-sans text-muted-foreground">{label}</dt>
      <dd
        className={
          accent
            ? "text-emerald-700"
            : muted
              ? "text-muted-foreground"
              : "text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  )
}

import { useMemo } from "react"
import { Area, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@components/ui/chart"

import { formatCount } from "@lib/utils"

import type { StatsPoint, StatsRange } from "./api"
import {
  dayMs,
  hourMs,
  metricLabels,
  zonedOffsetMs,
  type Grain,
  type ChartTrafficMetric,
} from "./search"

const trafficAccent = "#3B82F6"

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
  previous: number | null
  partial: boolean
}

export function DashboardChart({
  points,
  previousPoints,
  range,
  metric,
  compare,
  timeZone,
  framed = true,
}: {
  points: StatsPoint[]
  previousPoints: StatsPoint[]
  range: StatsRange
  metric: ChartTrafficMetric
  compare: boolean
  timeZone: string
  framed?: boolean
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
        .map((point) => [point.bucket as number, point[metric]])
    )
    const previousByBucket = new Map(
      previousPoints
        .filter((point) => point.bucket !== null)
        .map((point) => [point.bucket as number, point[metric]])
    )
    const firstPrevious = bucketOf(startMs - (endMs - startMs))
    const now = Date.now()
    const result: ChartRow[] = []
    for (
      let bucket = bucketOf(startMs), index = 0;
      bucket < endMs;
      bucket += size, index += 1
    ) {
      result.push({
        bucket,
        value: bucket > now ? null : (traffic.get(bucket) ?? 0),
        previous: compare
          ? (previousByBucket.get(firstPrevious + index * size) ?? 0)
          : null,
        partial: bucket + size > now,
      })
    }
    return result
  }, [
    points,
    previousPoints,
    range.start,
    range.end,
    grain,
    metric,
    compare,
    timeZone,
  ])

  const seriesLabel = metricLabels[metric]
  const chartConfig = {
    value: { label: seriesLabel, color: trafficAccent },
    previous: {
      label: `Previous ${seriesLabel.toLowerCase()}`,
      color: "var(--chart-2)",
    },
  } satisfies ChartConfig

  const tickCount = Math.min(7, Math.max(2, rows.length))
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    const rowIndex = Math.round((index / (tickCount - 1)) * (rows.length - 1))
    return rows[rowIndex]?.bucket ?? 0
  })

  const chart = (
    <>
      {compare ? (
        <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0.5 w-3 rounded-full bg-foreground"
            />
            {seriesLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="h-0 w-3 border-t border-dashed border-muted-foreground"
            />
            Previous period
          </span>
        </div>
      ) : null}
      <ChartContainer
        config={chartConfig}
        className="aspect-auto h-72 w-full [&_.recharts-cartesian-axis-tick_text]:font-mono"
        initialDimension={{ width: 960, height: 288 }}
      >
        <ComposedChart
          data={rows}
          margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
          accessibilityLayer
        >
          <defs>
            <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-value)"
                stopOpacity={0.22}
              />
              <stop
                offset="55%"
                stopColor="var(--color-value)"
                stopOpacity={0.06}
              />
              <stop
                offset="100%"
                stopColor="var(--color-value)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeOpacity={0.7}
            strokeDasharray="3 3"
          />
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
            tickFormatter={(value) => formatCount(Number(value))}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = payload?.[0]?.payload as ChartRow | undefined
              if (!active || !row) return null
              return (
                <div className="min-w-40 rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
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
                      label={seriesLabel}
                      value={(row.value ?? 0).toLocaleString()}
                    />
                    {compare && row.previous !== null ? (
                      <TooltipRow
                        label="Previous"
                        value={row.previous.toLocaleString()}
                        muted
                      />
                    ) : null}
                  </dl>
                </div>
              )
            }}
          />
          {compare ? (
            <Line
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
          <Area
            dataKey="value"
            type="monotone"
            stroke="var(--color-value)"
            strokeWidth={1.25}
            fill="url(#trafficFill)"
            dot={false}
            activeDot={{
              r: 3,
              strokeWidth: 1.5,
              stroke: "var(--color-value)",
              fill: "var(--background)",
            }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ChartContainer>
    </>
  )

  if (!framed) return chart
  return (
    <section className="rounded-xl border border-border/70 bg-card p-4">
      {chart}
    </section>
  )
}

function TooltipRow({
  label,
  value,
  muted,
}: {
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="font-sans text-muted-foreground">{label}</dt>
      <dd className={muted ? "text-muted-foreground" : "text-foreground"}>
        {value}
      </dd>
    </div>
  )
}

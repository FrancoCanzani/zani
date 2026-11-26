import { useMemo } from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

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
  bars: number
  previous: number | null
  partial: boolean
}

export function DashboardChart({
  points,
  previousPoints,
  range,
  bars,
  compare,
  timeZone,
}: {
  points: StatsPoint[]
  previousPoints: StatsPoint[]
  range: StatsRange
  bars: ChartTrafficMetric
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
    const now = Date.now()
    const result: ChartRow[] = []
    for (
      let bucket = bucketOf(startMs), index = 0;
      bucket < endMs;
      bucket += size, index += 1
    ) {
      result.push({
        bucket,
        bars: traffic.get(bucket) ?? 0,
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
    bars,
    compare,
    timeZone,
  ])

  const barLabel = metricLabels[bars]
  const chartConfig = {
    bars: { label: barLabel, color: "var(--foreground)" },
    previous: {
      label: `Previous ${barLabel.toLowerCase()}`,
      color: "var(--chart-2)",
    },
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
            tickLine={false}
            axisLine={false}
            tickMargin={6}
            width="auto"
            allowDecimals={false}
            tickFormatter={(value) => formatCount(Number(value))}
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
          <Bar
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
        </ComposedChart>
      </ChartContainer>
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

import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@components/ui/chart"

import { changePercent, type StatsPoint } from "./api"
import { metricLabels, type ChartMetric } from "./search"

type ViewsChartProps = {
  points: StatsPoint[]
  previousPoints: StatsPoint[]
  start: string
  end: string
  grain: "hour" | "day"
  metric: ChartMetric
  timeZone: string
  compare: boolean
}

type CurveStyle = "linear" | "step"

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

function bucketSize(grain: "hour" | "day") {
  return grain === "hour" ? hourMs : dayMs
}

function formatTick(ms: number, grain: "hour" | "day", timeZone: string) {
  if (grain === "hour") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(ms)
  }
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(ms)
}

function formatTooltipDate(ms: number, grain: "hour" | "day", timeZone: string) {
  if (grain === "hour") {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(ms)
  }
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(ms)
}

function formatAxisValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function fillSeries(
  points: StatsPoint[],
  start: string,
  end: string,
  grain: "hour" | "day",
  metric: ChartMetric
) {
  const size = bucketSize(grain)
  const startMs = Math.floor(Date.parse(start) / size) * size
  const endMs = Date.parse(end)
  const byBucket = new Map(
    points
      .filter((point) => point.bucket !== null)
      .map((point) => [point.bucket as number, point[metric]])
  )
  const series: Array<{ bucket: number; value: number }> = []
  for (let bucket = startMs; bucket < endMs; bucket += size) {
    series.push({ bucket, value: byBucket.get(bucket) ?? 0 })
  }
  return series
}

function withTrajectory(
  series: Array<{ bucket: number; value: number; previous?: number }>,
  grain: "hour" | "day"
) {
  const size = bucketSize(grain)
  const incompleteStart = Math.floor(Date.now() / size) * size
  let lastCompleteIndex = -1
  for (let index = 0; index < series.length; index += 1) {
    if (series[index]!.bucket < incompleteStart) lastCompleteIndex = index
  }

  return series.map((point, index) => {
    const base = {
      bucket: point.bucket,
      value: point.value,
      previous: point.previous ?? null,
    }
    if (lastCompleteIndex < 0 || lastCompleteIndex >= series.length - 1) {
      return { ...base, solid: point.value, dashed: null as number | null }
    }
    if (index < lastCompleteIndex) {
      return { ...base, solid: point.value, dashed: null as number | null }
    }
    if (index === lastCompleteIndex) {
      return { ...base, solid: point.value, dashed: point.value }
    }
    return { ...base, solid: null as number | null, dashed: point.value }
  })
}

export function ViewsChart({
  points,
  previousPoints,
  start,
  end,
  grain,
  metric,
  timeZone,
  compare,
}: ViewsChartProps) {
  const [curve, setCurve] = useState<CurveStyle>("linear")
  const series = useMemo(
    () => fillSeries(points, start, end, grain, metric),
    [points, start, end, grain, metric]
  )
  const previousSeries = useMemo(() => {
    const duration = Date.parse(end) - Date.parse(start)
    const previousStartMs = Date.parse(start) - duration
    return fillSeries(
      previousPoints,
      new Date(previousStartMs).toISOString(),
      start,
      grain,
      metric
    )
  }, [previousPoints, start, end, grain, metric])
  const chartData = useMemo(() => {
    const merged = series.map((point, index) => ({
      ...point,
      previous: previousSeries[index]?.value,
    }))
    return withTrajectory(merged, grain)
  }, [series, previousSeries, grain])
  const peak = Math.max(
    0,
    ...series.map((point) => point.value),
    ...(compare ? previousSeries.map((point) => point.value) : [])
  )
  const label = metricLabels[metric]
  const areaType = curve === "step" ? "stepAfter" : "monotone"

  const chartConfig = {
    solid: {
      label,
      color: "var(--foreground)",
    },
    dashed: {
      label,
      color: "var(--foreground)",
    },
    previous: {
      label: `Prior ${label.toLowerCase()}`,
      color: "var(--muted-foreground)",
    },
  } satisfies ChartConfig

  const xTickCount = Math.min(6, Math.max(2, series.length))
  const xTicks = Array.from({ length: xTickCount }, (_, index) => {
    if (series.length === 0) return 0
    if (xTickCount === 1) return series[0]!.bucket
    const seriesIndex = Math.round(
      (index / (xTickCount - 1)) * (series.length - 1)
    )
    return series[seriesIndex]!.bucket
  })

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <p className="text-sm text-muted-foreground">{label} over time</p>
          <p className="font-mono text-sm tabular-nums text-muted-foreground">
            peak {peak}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant={curve === "linear" ? "secondary" : "ghost"}
            onClick={() => setCurve("linear")}
          >
            Smooth
          </Button>
          <Button
            type="button"
            size="xs"
            variant={curve === "step" ? "secondary" : "ghost"}
            onClick={() => setCurve("step")}
          >
            Stepped
          </Button>
        </div>
      </div>
      <ChartContainer
        key={`${metric}-${curve}-${compare ? "cmp" : "solo"}`}
        config={chartConfig}
        className="aspect-auto h-72 w-full [&_.recharts-cartesian-axis-tick_text]:font-mono"
        initialDimension={{ width: 960, height: 288 }}
      >
        <AreaChart
          data={chartData}
          margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
          accessibilityLayer
        >
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="bucket"
            type="number"
            domain={["dataMin", "dataMax"]}
            ticks={xTicks}
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tickFormatter={(value) =>
              formatTick(Number(value), grain, timeZone)
            }
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={44}
            allowDecimals={false}
            tickFormatter={(value) => formatAxisValue(Number(value))}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0]?.payload as
                | { bucket: number; value: number; previous?: number | null }
                | undefined
              if (!row) return null
              const seriesIndex = series.findIndex(
                (point) => point.bucket === row.bucket
              )
              const previousValue =
                seriesIndex >= 0
                  ? previousSeries[seriesIndex]?.value
                  : undefined
              const delta =
                previousValue === undefined
                  ? null
                  : changePercent(row.value, previousValue)
              return (
                <div className="rounded-md border border-border bg-background px-3 py-2 shadow-sm">
                  <p className="font-mono text-sm font-medium tabular-nums">
                    {formatTooltipDate(row.bucket, grain, timeZone)}:{" "}
                    {row.value} {label}
                  </p>
                  {compare && previousValue !== undefined ? (
                    <p className="mt-0.5 font-mono text-xs font-medium tabular-nums text-muted-foreground">
                      Prior: {previousValue}
                    </p>
                  ) : null}
                  {delta === null ? null : (
                    <p
                      className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${
                        delta > 0
                          ? "text-emerald-700"
                          : delta < 0
                            ? "text-red-700"
                            : "text-muted-foreground"
                      }`}
                    >
                      {delta > 0 ? "+" : ""}
                      {delta}% vs prior
                    </p>
                  )}
                </div>
              )
            }}
          />
          {compare ? (
            <Area
              dataKey="previous"
              type={areaType}
              fill="var(--color-previous)"
              fillOpacity={0.04}
              stroke="var(--color-previous)"
              strokeWidth={1}
              strokeDasharray="3 3"
              isAnimationActive={false}
              dot={false}
              activeDot={false}
              connectNulls={false}
            />
          ) : null}
          <Area
            dataKey="solid"
            type={areaType}
            fill="var(--color-solid)"
            fillOpacity={0.1}
            stroke="var(--color-solid)"
            strokeWidth={1.25}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 1, fill: "var(--background)" }}
            connectNulls={false}
          />
          <Area
            dataKey="dashed"
            type={areaType}
            fill="var(--color-dashed)"
            fillOpacity={0.04}
            stroke="var(--color-dashed)"
            strokeWidth={1.25}
            strokeDasharray="5 4"
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3.5, strokeWidth: 1, fill: "var(--background)" }}
            connectNulls={false}
            legendType="none"
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

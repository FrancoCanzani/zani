import { useMemo, useState } from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { Button } from "@components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@components/ui/chart"

import type { StatsPoint } from "./api"
import { metricLabels, type Metric } from "./search"

type ViewsChartProps = {
  points: StatsPoint[]
  start: string
  end: string
  grain: "hour" | "day"
  metric: Metric
}

type CurveStyle = "linear" | "step"

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs

function bucketSize(grain: "hour" | "day") {
  return grain === "hour" ? hourMs : dayMs
}

function formatTick(ms: number, grain: "hour" | "day") {
  if (grain === "hour") {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(ms)
  }
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(ms)
}

function formatTooltipDate(ms: number, grain: "hour" | "day") {
  if (grain === "hour") {
    return new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(ms)
  }
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(ms)
}

function fillSeries(
  points: StatsPoint[],
  start: string,
  end: string,
  grain: "hour" | "day",
  metric: Metric
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

export function ViewsChart({
  points,
  start,
  end,
  grain,
  metric,
}: ViewsChartProps) {
  const [curve, setCurve] = useState<CurveStyle>("linear")
  const series = useMemo(
    () => fillSeries(points, start, end, grain, metric),
    [points, start, end, grain, metric]
  )
  const peak = Math.max(0, ...series.map((point) => point.value))
  const label = metricLabels[metric]

  const chartConfig = {
    value: {
      label,
      color: "var(--foreground)",
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
        key={`${metric}-${curve}`}
        config={chartConfig}
        className="aspect-auto h-72 w-full [&_.recharts-cartesian-axis-tick_text]:font-mono"
        initialDimension={{ width: 960, height: 288 }}
      >
        <AreaChart
          data={series}
          margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
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
            tickFormatter={(value) => formatTick(Number(value), grain)}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={40}
            allowDecimals={false}
            tickFormatter={(value) => String(value)}
          />
          <ChartTooltip
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            content={
              <ChartTooltipContent
                className="border-border shadow-sm"
                indicator="line"
                labelFormatter={(_, payload) => {
                  const bucket = Number(payload?.[0]?.payload?.bucket ?? 0)
                  return formatTooltipDate(bucket, grain)
                }}
                formatter={(value) => (
                  <span className="font-mono tabular-nums">
                    {String(value)} {label}
                  </span>
                )}
              />
            }
          />
          <Area
            dataKey="value"
            type={curve === "step" ? "stepAfter" : "monotone"}
            fill="var(--color-value)"
            fillOpacity={0.12}
            stroke="var(--color-value)"
            strokeWidth={1.25}
            isAnimationActive={false}
            dot={false}
            activeDot={{ r: 3, strokeWidth: 1 }}
          />
        </AreaChart>
      </ChartContainer>
    </div>
  )
}

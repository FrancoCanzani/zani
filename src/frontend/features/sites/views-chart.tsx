import type { StatsPoint } from "./api"
import { metricLabels, type Metric } from "./search"

type ViewsChartProps = {
  points: StatsPoint[]
  start: string
  end: string
  grain: "hour" | "day"
  metric: Metric
}

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs
const width = 720
const height = 220
const pad = { top: 16, right: 12, bottom: 28, left: 44 }

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

function formatValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}k`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return String(value)
}

function niceMax(value: number) {
  if (value <= 1) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return nice * magnitude
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
  const series = fillSeries(points, start, end, grain, metric)
  const max = niceMax(Math.max(1, ...series.map((point) => point.value)))
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: Math.round(max * ratio),
    y: pad.top + plotH * (1 - ratio),
  }))
  const xTickCount = Math.min(6, Math.max(2, series.length))
  const xTicks = Array.from({ length: xTickCount }, (_, index) => {
    const seriesIndex =
      xTickCount === 1
        ? 0
        : Math.round((index / (xTickCount - 1)) * (series.length - 1))
    return series[seriesIndex]!
  })

  const coords = series.map((point, index) => {
    const x =
      pad.left +
      (series.length === 1 ? plotW / 2 : (index / (series.length - 1)) * plotW)
    const y = pad.top + plotH - (point.value / max) * plotH
    return { x, y, ...point }
  })

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ")
  const area =
    coords.length === 0
      ? ""
      : `${line} L${coords[coords.length - 1]!.x} ${pad.top + plotH} L${coords[0]!.x} ${pad.top + plotH} Z`

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {metricLabels[metric]} over time
        </p>
        <p className="text-sm tabular-nums text-muted-foreground">
          peak {formatValue(Math.max(0, ...series.map((point) => point.value)))}
        </p>
      </div>
      <svg
        key={metric}
        viewBox={`0 0 ${width} ${height}`}
        className="h-56 w-full"
        role="img"
        aria-label={`${metricLabels[metric]} over time`}
      >
        {yTicks.map((tick) => (
          <g key={tick.ratio}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={tick.y}
              y2={tick.y}
              className="stroke-border"
              strokeWidth={1}
            />
            <text
              x={pad.left - 8}
              y={tick.y}
              textAnchor="end"
              dominantBaseline="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatValue(tick.value)}
            </text>
          </g>
        ))}
        <path d={area} className="fill-foreground/10" />
        <path
          d={line}
          className="fill-none stroke-foreground stroke-2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((point) => (
          <g key={point.bucket}>
            <circle
              cx={point.x}
              cy={point.y}
              r={point.value > 0 ? 3 : 0}
              className="fill-foreground"
            />
            <circle cx={point.x} cy={point.y} r={12} className="fill-transparent">
              <title>
                {formatTick(point.bucket, grain)} · {point.value}{" "}
                {metricLabels[metric].toLowerCase()}
              </title>
            </circle>
          </g>
        ))}
        {xTicks.map((tick, index) => {
          const seriesIndex = series.indexOf(tick)
          const x =
            pad.left +
            (series.length === 1
              ? plotW / 2
              : (seriesIndex / (series.length - 1)) * plotW)
          return (
            <text
              key={`${tick.bucket}-${index}`}
              x={x}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatTick(tick.bucket, grain)}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

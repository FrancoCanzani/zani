import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react"

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
const height = 280
const pad = { top: 28, right: 16, bottom: 36, left: 48 }

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

function formatValue(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 10_000) return `${Math.round(value / 1000)}k`
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
  const series = useMemo(
    () => fillSeries(points, start, end, grain, metric),
    [points, start, end, grain, metric]
  )
  const peak = Math.max(0, ...series.map((point) => point.value))
  const max = niceMax(Math.max(1, peak))
  const [hover, setHover] = useState<number | null>(null)
  const [width, setWidth] = useState(960)
  const frameRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setHover(null)
  }, [metric, start, end, grain])

  useEffect(() => {
    const node = frameRef.current
    if (!node) return
    const sync = () => {
      const next = Math.round(node.clientWidth)
      if (next > 0) setWidth(next)
    }
    sync()
    const observer = new ResizeObserver(sync)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const plotW = Math.max(1, width - pad.left - pad.right)
  const plotH = height - pad.top - pad.bottom

  const coords = series.map((point, index) => {
    const x =
      pad.left +
      (series.length === 1 ? plotW / 2 : (index / (series.length - 1)) * plotW)
    const y = pad.top + plotH - (point.value / max) * plotH
    return { x, y, index, ...point }
  })

  const active = hover === null ? null : coords[hover]
  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ")
  const area =
    coords.length === 0
      ? ""
      : `${line} L${coords[coords.length - 1]!.x} ${pad.top + plotH} L${coords[0]!.x} ${pad.top + plotH} Z`

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
    return coords[seriesIndex]!
  })

  function onMove(event: MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * width
    if (coords.length === 0) return
    let nearest = 0
    let best = Infinity
    for (const point of coords) {
      const distance = Math.abs(point.x - x)
      if (distance < best) {
        best = distance
        nearest = point.index
      }
    }
    setHover(nearest)
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {metricLabels[metric]} over time
        </p>
        <p className="font-mono text-sm tabular-nums text-muted-foreground">
          peak {peak}
        </p>
      </div>
      <div className="w-full" ref={frameRef}>
        <svg
          key={metric}
          viewBox={`0 0 ${width} ${height}`}
          className="h-72 w-full touch-none"
          role="img"
          aria-label={`${metricLabels[metric]} over time`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
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
                x={pad.left - 10}
                y={tick.y}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground font-mono text-[11px]"
              >
                {formatValue(tick.value)}
              </text>
            </g>
          ))}
          <path d={area} className="fill-foreground/8" />
          <path
            d={line}
            className="fill-none stroke-foreground stroke-2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {xTicks.map((tick, index) => (
            <text
              key={`${tick.bucket}-${index}`}
              x={tick.x}
              y={height - 10}
              textAnchor="middle"
              className="fill-muted-foreground font-mono text-[11px]"
            >
              {formatTick(tick.bucket, grain)}
            </text>
          ))}
          {active ? (
            <g>
              <line
                x1={active.x}
                x2={active.x}
                y1={pad.top}
                y2={pad.top + plotH}
                className="stroke-foreground/40"
                strokeWidth={1}
              />
              <circle
                cx={active.x}
                cy={active.y}
                r={4}
                className="fill-background stroke-foreground stroke-2"
              />
              <foreignObject
                x={Math.min(Math.max(active.x - 90, pad.left), width - 180)}
                y={Math.max(active.y - 42, 4)}
                width={180}
                height={36}
              >
                <div className="rounded-md border border-border bg-background px-2 py-1 text-center text-xs shadow-sm">
                  <span className="font-mono tabular-nums">
                    {formatTooltipDate(active.bucket, grain)}: {active.value}{" "}
                    {metricLabels[metric]}
                  </span>
                </div>
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  )
}

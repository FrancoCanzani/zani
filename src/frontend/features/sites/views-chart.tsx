import type { StatsPoint } from "./api"
import type { Metric } from "./search"

type ViewsChartProps = {
  points: StatsPoint[]
  start: string
  end: string
  grain: "hour" | "day"
  metric: Metric
}

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs
const width = 640
const height = 160
const padY = 4

function bucketSize(grain: "hour" | "day") {
  return grain === "hour" ? hourMs : dayMs
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
  const max = Math.max(1, ...series.map((point) => point.value))
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(grain === "hour" ? { hour: "numeric" as const } : {}),
  })

  const coords = series.map((point, index) => {
    const x =
      series.length === 1 ? width / 2 : (index / (series.length - 1)) * width
    const y = height - padY - (point.value / max) * (height - padY * 2)
    return { x, y, ...point }
  })

  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ")
  const area =
    coords.length === 0
      ? ""
      : `${line} L${coords[coords.length - 1]!.x} ${height} L${coords[0]!.x} ${height} Z`

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-40 w-full overflow-visible"
        role="img"
        aria-label={`${metric} over time`}
      >
        <path d={area} className="fill-foreground/10" />
        <path
          d={line}
          className="fill-none stroke-foreground stroke-2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {coords.map((point) => (
          <circle
            key={point.bucket}
            cx={point.x}
            cy={point.y}
            r={10}
            className="fill-transparent"
          >
            <title>
              {label.format(point.bucket)} · {point.value}
            </title>
          </circle>
        ))}
      </svg>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label.format(Date.parse(start))}</span>
        <span>{label.format(Date.parse(end) - 1)}</span>
      </div>
    </div>
  )
}

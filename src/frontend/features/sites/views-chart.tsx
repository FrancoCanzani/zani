import type { StatsPoint } from "./api"

type ViewsChartProps = {
  points: StatsPoint[]
  start: string
  end: string
  grain: "hour" | "day"
}

const hourMs = 60 * 60 * 1000
const dayMs = 24 * hourMs
const chartHeight = 112

function bucketSize(grain: "hour" | "day") {
  return grain === "hour" ? hourMs : dayMs
}

function fillSeries(
  points: StatsPoint[],
  start: string,
  end: string,
  grain: "hour" | "day"
) {
  const size = bucketSize(grain)
  const startMs = Math.floor(Date.parse(start) / size) * size
  const endMs = Date.parse(end)
  const byBucket = new Map(
    points
      .filter((point) => point.bucket !== null)
      .map((point) => [point.bucket as number, point.views])
  )
  const series: Array<{ bucket: number; views: number }> = []
  for (let bucket = startMs; bucket < endMs; bucket += size) {
    series.push({ bucket, views: byBucket.get(bucket) ?? 0 })
  }
  return series
}

export function ViewsChart({ points, start, end, grain }: ViewsChartProps) {
  const series = fillSeries(points, start, end, grain)
  const max = Math.max(1, ...series.map((point) => point.views))
  const label = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    ...(grain === "hour" ? { hour: "numeric" as const } : {}),
  })

  return (
    <div className="space-y-2">
      <div className="flex items-end gap-px" style={{ height: chartHeight }}>
        {series.map((point) => {
          const height =
            point.views === 0
              ? 0
              : Math.max(2, (point.views / max) * chartHeight)
          return (
            <div
              key={point.bucket}
              className="min-w-0 flex-1 rounded-sm bg-foreground"
              style={{ height }}
              title={`${label.format(point.bucket)} · ${point.views}`}
            />
          )
        })}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label.format(Date.parse(start))}</span>
        <span>{label.format(Date.parse(end) - 1)}</span>
      </div>
    </div>
  )
}

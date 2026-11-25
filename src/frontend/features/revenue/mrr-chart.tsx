import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import {
  ChartContainer,
  ChartTooltip,
  type ChartConfig,
} from "@components/ui/chart"

import { formatMoney, type RevenuePoint } from "./api"

const chartConfig = {
  mrr: { label: "MRR", color: "var(--chart-2)" },
} satisfies ChartConfig

function formatDay(ms: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(ms)
}

function formatAxis(minor: number) {
  const major = minor / 100
  if (major >= 1_000_000) return `${(major / 1_000_000).toFixed(1)}M`
  if (major >= 1000)
    return `${(major / 1000).toFixed(major >= 10_000 ? 0 : 1)}k`
  return String(Math.round(major))
}

export function MrrChart({
  points,
  currency,
}: {
  points: RevenuePoint[]
  currency: string
}) {
  const tickCount = Math.min(6, Math.max(2, points.length))
  const ticks = Array.from({ length: tickCount }, (_, index) => {
    if (points.length === 0) return 0
    const at = Math.round((index / (tickCount - 1)) * (points.length - 1))
    return points[at]!.at
  })

  return (
    <ChartContainer
      config={chartConfig}
      className="aspect-auto h-72 w-full [&_.recharts-cartesian-axis-tick_text]:font-mono"
      initialDimension={{ width: 960, height: 288 }}
    >
      <AreaChart
        data={points}
        margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
        accessibilityLayer
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="at"
          type="number"
          domain={["dataMin", "dataMax"]}
          ticks={ticks}
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          tickFormatter={(value) => formatDay(Number(value))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={44}
          tickFormatter={(value) => formatAxis(Number(value))}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as RevenuePoint | undefined
            if (!active || !row) return null
            return (
              <div className="space-y-0.5 rounded-md border border-border bg-background px-3 py-2 font-mono text-xs tabular-nums shadow-sm">
                <p className="text-sm font-medium">
                  {formatDay(row.at)}: {formatMoney(row.mrr, currency)}
                </p>
                {row.gained > 0 ? (
                  <p className="text-emerald-700">
                    +{formatMoney(row.gained, currency)}
                  </p>
                ) : null}
                {row.lost < 0 ? (
                  <p className="text-red-700">
                    {formatMoney(row.lost, currency)}
                  </p>
                ) : null}
              </div>
            )
          }}
        />
        <Area
          dataKey="mrr"
          type="stepAfter"
          fill="var(--color-mrr)"
          fillOpacity={0.08}
          stroke="var(--color-mrr)"
          strokeWidth={1}
          isAnimationActive={false}
          dot={false}
          activeDot={{
            r: 3,
            strokeWidth: 1,
            stroke: "var(--color-mrr)",
            fill: "var(--background)",
          }}
        />
      </AreaChart>
    </ChartContainer>
  )
}

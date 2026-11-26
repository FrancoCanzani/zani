import { useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { startTransition, useEffect, useState } from "react"

import { ActivityFeed } from "./activity-feed"
import { siteOnlineQueryOptions, siteStatsQueryOptions } from "./api"
import { BreakdownPanel } from "./breakdown-panel"
import { DashboardChart } from "./dashboard-chart"
import { breakdownPanels } from "./panels"
import { liveRange, liveTickMs } from "./search"
import { useSiteSearch } from "./use-site-search"

const livePanelIds = new Set(["pages", "sources", "countries"])
const livePanels = breakdownPanels.filter((panel) => livePanelIds.has(panel.id))
const noRevenue = { enabled: false, currency: "usd" }

function PulseDot({ active }: { active: boolean }) {
  return (
    <span aria-hidden className="relative flex size-2">
      {active ? (
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
      ) : null}
      <span
        className={`relative inline-flex size-2 rounded-full ${active ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
      />
    </span>
  )
}

export function LivePill({
  slug,
  siteId,
  active,
  onToggle,
}: {
  slug: string
  siteId: string
  active: boolean
  onToggle: () => void
}) {
  const { data } = useQuery(siteOnlineQueryOptions(slug, siteId))
  const online = data?.online ?? 0

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className={`inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        active
          ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-800"
          : "border-border text-muted-foreground hover:border-foreground/20 hover:text-foreground"
      }`}
    >
      <PulseDot active={online > 0 || active} />
      <span className="font-mono tabular-nums">
        {data ? online.toLocaleString() : "–"}
      </span>
      online now
    </button>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-card px-3 py-3">
      <div className="text-[13px] text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-medium tracking-tight tabular-nums">
        {value.toLocaleString()}
      </div>
    </div>
  )
}

export function LiveDashboard() {
  const {
    slug,
    siteId,
    search,
    filters,
    includeBots,
    goal,
    timeZone,
    toggleFilter,
  } = useSiteSearch()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = window.setInterval(() => {
      startTransition(() => setNow(Date.now()))
    }, liveTickMs)
    return () => window.clearInterval(handle)
  }, [])

  const range = { ...liveRange(now), tz: search.tz }
  const totals = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      undefined,
      range,
      filters,
      includeBots,
      goal
    )
  )
  const online = useQuery(siteOnlineQueryOptions(slug, siteId))

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Online now" value={online.data?.online ?? 0} />
        <Stat label="Visitors · 30 min" value={totals.data.visitors} />
        <Stat label="Pageviews · 30 min" value={totals.data.views} />
      </div>

      <DashboardChart
        points={totals.data.points}
        previousPoints={[]}
        revenuePoints={[]}
        range={range}
        bars="views"
        line="new_mrr"
        currency="usd"
        showRevenue={false}
        compare={false}
        timeZone={timeZone}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {livePanels.map((panel) => (
          <BreakdownPanel
            key={panel.id}
            panel={panel}
            slug={slug}
            siteId={siteId}
            range={range}
            filters={filters}
            includeBots={includeBots}
            search={search}
            revenue={noRevenue}
            onSelect={toggleFilter}
          />
        ))}
        <ActivityFeed
          slug={slug}
          siteId={siteId}
          range={range}
          filters={filters}
          includeBots={includeBots}
          live
          framed
          now={now}
          onSelect={toggleFilter}
        />
      </div>
    </>
  )
}

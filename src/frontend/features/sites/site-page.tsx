import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { XIcon } from "lucide-react"
import { startTransition } from "react"
import { toast } from "sonner"

import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import {
  changePercent,
  previousStatsRange,
  simulateSiteViews,
  siteStatsQueryOptions,
  statsQueryFromSearch,
  type SiteStats,
  type StatsFilters,
  type StatsRange,
} from "./api"
import { BreakdownPanel } from "./breakdown-panel"
import { breakdownPanels } from "./panels"
import { RangePicker } from "./range-picker"
import { SiteTabs } from "./site-tabs"
import {
  activeFilterChips,
  filterKeys,
  filterLabels,
  isChartMetric,
  metricLabels,
  rangeLabels,
  type ChartMetric,
  type FilterKey,
  type Metric,
  type SiteSearch,
} from "./search"
import { ViewsChart } from "./views-chart"
import { useRememberedWriteKey } from "./write-key"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId/")

const quickRanges = ["1d", "7d", "30d"] as const

const kpiMetrics = [
  "views",
  "visitors",
  "sessions",
  "bounce",
  "views_per_visit",
] as const satisfies readonly Metric[]

function formatStatsRange(start: string, end: string, timeZone: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone,
  })
  const monthDayYear = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  })
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${monthDay.format(startDate)} – ${monthDayYear.format(endDate)}`
  }
  return `${monthDayYear.format(startDate)} – ${monthDayYear.format(endDate)}`
}

function metricValue(stats: SiteStats, metric: Metric) {
  switch (metric) {
    case "views":
      return stats.views
    case "visitors":
      return stats.visitors
    case "sessions":
      return stats.sessions
    case "bounce":
      return stats.bounceRate
    case "views_per_visit":
      return stats.viewsPerVisit
    default: {
      const exhaustive: never = metric
      return exhaustive
    }
  }
}

function formatMetricValue(metric: Metric, value: number) {
  switch (metric) {
    case "bounce":
      return `${value}%`
    case "views_per_visit":
      return value.toFixed(2)
    case "views":
    case "visitors":
    case "sessions":
      return String(value)
    default: {
      const exhaustive: never = metric
      return exhaustive
    }
  }
}

function dateInputValue(iso: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso))
  const year = parts.find((part) => part.type === "year")?.value
  const month = parts.find((part) => part.type === "month")?.value
  const day = parts.find((part) => part.type === "day")?.value
  if (!year || !month || !day) return ""
  return `${year}-${month}-${day}`
}

function clearFiltersPatch(): Partial<SiteSearch> {
  const patch: Partial<SiteSearch> = {}
  for (const key of filterKeys) {
    patch[key] = undefined
  }
  return patch
}

export function SitePage() {
  const { slug, siteId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const queryClient = useQueryClient()
  const { range, filters, includeBots } = statsQueryFromSearch(search)
  const chips = activeFilterChips(search)
  const timeZone = search.tz || "UTC"
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters, includeBots)
  )
  const previousTotals = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      undefined,
      previousStatsRange(range),
      filters,
      includeBots
    )
  )

  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role !== null && canManageBusiness(role)
  const revoked = totals.data.site.revokedAt !== null
  const { writeKey } = useRememberedWriteKey(siteId)

  function patchSearch(patch: Partial<SiteSearch>) {
    startTransition(() => {
      void navigate({
        search: (prev) => {
          const next = { ...prev, ...patch }
          for (const key of Object.keys(patch) as Array<keyof SiteSearch>) {
            if (patch[key] === undefined) delete next[key]
          }
          return next
        },
      })
    })
  }

  function toggleFilter(key: FilterKey, value: string) {
    patchSearch({
      [key]: search[key] === value ? undefined : value,
    })
  }

  const simulate = useMutation({
    mutationFn: () => simulateSiteViews(slug, siteId),
    onSuccess: async (result) => {
      toast.success(
        `Simulated ${result.inserted} views, ${result.signups} signups, and ${result.customers} customers`
      )
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["site-stats", slug, siteId],
        }),
        queryClient.invalidateQueries({ queryKey: ["revenue", slug, siteId] }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const chartMetric = isChartMetric(search.metric) ? search.metric : "views"

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">
            {totals.data.site.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {totals.data.site.domain}
          </p>
          <p className="font-mono text-sm text-muted-foreground">
            {formatStatsRange(range.start, range.end, timeZone)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {import.meta.env.DEV ? (
            <Button
              type="button"
              variant="outline"
              disabled={simulate.isPending || revoked}
              onClick={() => simulate.mutate()}
            >
              {simulate.isPending ? "Simulating…" : "Simulate data"}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link
              to="/businesses/$slug/sites/$siteId/settings"
              params={{ slug, siteId }}
            >
              Settings
            </Link>
          </Button>
        </div>
      </div>

      <SiteTabs slug={slug} siteId={siteId} active="traffic" />

      {revoked ? (
        <p className="text-sm text-muted-foreground">
          Collection is stopped. New pageviews are not recorded.
        </p>
      ) : null}

      {totals.data.hasEvents ? (
        <SiteDashboard
          search={search}
          timeZone={timeZone}
          localTz={localTz}
          range={range}
          chips={chips}
          chartMetric={chartMetric}
          totals={totals.data}
          previousTotals={previousTotals.data}
          slug={slug}
          siteId={siteId}
          filters={filters}
          includeBots={includeBots}
          patchSearch={patchSearch}
          toggleFilter={toggleFilter}
        />
      ) : revoked ? (
        <p className="text-sm text-muted-foreground">
          No pageviews were recorded.
        </p>
      ) : (
        <WaitingForViews
          domain={totals.data.site.domain}
          writeKey={writeKey}
          canManage={canManage}
          slug={slug}
          siteId={siteId}
        />
      )}
    </div>
  )
}

function WaitingForViews({
  domain,
  writeKey,
  canManage,
  slug,
  siteId,
}: {
  domain: string
  writeKey: string | null
  canManage: boolean
  slug: string
  siteId: string
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm text-muted-foreground">
          Waiting for the first pageview
        </h2>
        {writeKey ? (
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Paste the script on {domain}, then load a page.
          </p>
        ) : canManage ? (
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            The write key was shown once. Rotate it to copy a new script.
          </p>
        ) : (
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            An owner or admin installs the script.
          </p>
        )}
      </div>
      {writeKey ? (
        <InstallSnippet
          label="Write key"
          writeKey={writeKey}
          note="Shown once."
        />
      ) : canManage ? (
        <Button asChild variant="outline">
          <Link
            to="/businesses/$slug/sites/$siteId/settings"
            params={{ slug, siteId }}
            hash="install"
          >
            Get a new write key
          </Link>
        </Button>
      ) : null}
    </section>
  )
}
function SiteDashboard({
  search,
  timeZone,
  localTz,
  range,
  chips,
  chartMetric,
  totals,
  previousTotals,
  slug,
  siteId,
  filters,
  includeBots,
  patchSearch,
  toggleFilter,
}: {
  search: SiteSearch
  timeZone: string
  localTz: string
  range: StatsRange
  chips: ReturnType<typeof activeFilterChips>
  chartMetric: ChartMetric
  totals: SiteStats
  previousTotals: SiteStats
  slug: string
  siteId: string
  filters: StatsFilters
  includeBots: boolean
  patchSearch: (patch: Partial<SiteSearch>) => void
  toggleFilter: (key: FilterKey, value: string) => void
}) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {quickRanges.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="xs"
            variant={search.range === preset ? "default" : "outline"}
            onClick={() =>
              patchSearch({
                range: preset,
                from: undefined,
                to: undefined,
              })
            }
          >
            {rangeLabels[preset]}
          </Button>
        ))}
        <RangePicker
          from={search.from ?? dateInputValue(range.start, timeZone)}
          to={search.to ?? dateInputValue(range.end, timeZone)}
          timeZone={timeZone}
          localTz={localTz}
          active={search.range === "custom"}
          label={
            search.range === "custom" && search.from && search.to
              ? `${search.from} → ${search.to}`
              : "Custom"
          }
          onCustom={(from, to) =>
            patchSearch({
              range: "custom",
              from,
              to,
            })
          }
          onTimeZone={(tz) => patchSearch({ tz })}
        />
        <Button
          type="button"
          size="xs"
          variant={search.compare ? "default" : "outline"}
          onClick={() =>
            patchSearch({ compare: search.compare ? undefined : true })
          }
        >
          Compare
        </Button>
        <Button
          type="button"
          size="xs"
          variant={search.bots ? "default" : "outline"}
          onClick={() => patchSearch({ bots: search.bots ? undefined : true })}
        >
          Bots
        </Button>
        {chips.map((chip) => (
          <Button
            key={`${chip.key}:${chip.value}`}
            type="button"
            size="xs"
            variant="secondary"
            onClick={() => patchSearch({ [chip.key]: undefined })}
          >
            {filterLabels[chip.key]}: {chip.value || "(none)"}
            <XIcon data-icon="inline-end" />
          </Button>
        ))}
        {chips.length > 0 ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            onClick={() => patchSearch(clearFiltersPatch())}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpiMetrics.map((metric) => {
          const selected = search.metric === metric
          const current = metricValue(totals, metric)
          const previous = metricValue(previousTotals, metric)
          const delta = changePercent(current, previous)
          return (
            <button
              key={metric}
              type="button"
              onClick={() => patchSearch({ metric })}
              className={`rounded-xl border px-3 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${selected ? "border-foreground/30 bg-muted/50" : "border-border/80 hover:bg-muted/30"}`}
            >
              <div className="text-sm text-muted-foreground">
                {metricLabels[metric]}
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <div className="font-mono text-3xl font-medium tracking-tight tabular-nums">
                  {formatMetricValue(metric, current)}
                </div>
                {delta === null ? null : (
                  <span
                    className={`rounded-full px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums ${
                      delta > 0
                        ? "bg-emerald-500/10 text-emerald-700"
                        : delta < 0
                          ? "bg-red-500/10 text-red-700"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {delta > 0 ? "+" : ""}
                    {delta}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <ViewsChart
        key={`${chartMetric}-${timeZone}-${search.compare ? "cmp" : "solo"}`}
        points={totals.points}
        previousPoints={previousTotals.points}
        start={range.start}
        end={range.end}
        grain={range.grain}
        metric={chartMetric}
        timeZone={timeZone}
        compare={Boolean(search.compare)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {breakdownPanels.map((panel) => (
          <BreakdownPanel
            key={panel.id}
            title={panel.title}
            tabs={panel.tabs}
            slug={slug}
            siteId={siteId}
            range={range}
            filters={filters}
            includeBots={includeBots}
            search={search}
            onSelect={toggleFilter}
          />
        ))}
      </div>
    </>
  )
}

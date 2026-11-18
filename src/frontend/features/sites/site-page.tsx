import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import { EllipsisIcon, XIcon } from "lucide-react"
import { startTransition, useState } from "react"
import { toast } from "sonner"

import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/ui/dropdown-menu"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import {
  changePercent,
  previousStatsRange,
  replaceWriteKey,
  simulateSiteViews,
  siteStatsQueryOptions,
  statsQueryFromSearch,
  type Breakdown,
  type SiteStats,
} from "./api"
import {
  activeFilterChips,
  filterLabels,
  isChartMetric,
  metricLabels,
  rangeLabels,
  type FilterKey,
  type Metric,
  type SiteSearch,
} from "./search"
import { RangePicker } from "./range-picker"
import { ViewsChart } from "./views-chart"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId")

type BreakdownTab = {
  key: Breakdown
  label: string
  filterKey: FilterKey
}

const breakdownPanels: Array<{
  id: string
  title: string
  tabs: BreakdownTab[]
}> = [
  {
    id: "pages",
    title: "Pages",
    tabs: [
      { key: "path", label: "Path", filterKey: "path" },
      { key: "entry", label: "Entry", filterKey: "path" },
      { key: "exit", label: "Exit", filterKey: "path" },
    ],
  },
  {
    id: "referrers",
    title: "Referrers",
    tabs: [{ key: "referrer", label: "Referrer", filterKey: "referrer" }],
  },
  {
    id: "utm",
    title: "UTM",
    tabs: [
      { key: "utm_source", label: "Source", filterKey: "utm_source" },
      { key: "utm_medium", label: "Medium", filterKey: "utm_medium" },
      { key: "utm_campaign", label: "Campaign", filterKey: "utm_campaign" },
      { key: "utm_content", label: "Content", filterKey: "utm_content" },
      { key: "utm_term", label: "Term", filterKey: "utm_term" },
    ],
  },
  {
    id: "countries",
    title: "Countries",
    tabs: [
      { key: "country", label: "Country", filterKey: "country" },
      { key: "city", label: "City", filterKey: "city" },
    ],
  },
  {
    id: "devices",
    title: "Devices",
    tabs: [
      { key: "browser", label: "Browser", filterKey: "browser" },
      { key: "os", label: "OS", filterKey: "os" },
      { key: "device", label: "Device", filterKey: "device" },
      { key: "screen", label: "Screen", filterKey: "screen" },
    ],
  },
]

const quickRanges = ["1d", "7d", "30d"] as const

const kpiMetrics = [
  "views",
  "visitors",
  "sessions",
  "bounce",
  "views_per_visit",
] as const

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

function BreakdownTable({
  filterKey,
  data,
  activeValue,
  onSelect,
}: {
  filterKey: FilterKey
  data: SiteStats
  activeValue: string | undefined
  onSelect: (key: FilterKey, value: string) => void
}) {
  const maxViews = Math.max(1, ...data.points.map((point) => point.views))
  const totalViews = data.points.reduce((sum, point) => sum + point.views, 0)

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1.5">
        {data.points.length === 0 ? (
          <li className="py-2 text-xs text-muted-foreground">No data</li>
        ) : (
          data.points.map((point) => {
            const value = point.series
            const selected = activeValue === value
            const share = totalViews === 0 ? 0 : point.views / totalViews
            return (
              <li key={value || "(none)"}>
                <button
                  type="button"
                  onClick={() => onSelect(filterKey, value)}
                  className={`relative flex h-[30px] w-full items-center gap-2 overflow-hidden rounded-md px-2 text-left text-[13px] transition-colors hover:bg-muted/60 ${selected ? "bg-muted/60" : ""}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-foreground/[0.06]"
                    style={{ width: `${(point.views / maxViews) * 100}%` }}
                  />
                  <span className="relative min-w-0 flex-1 truncate font-mono">
                    {value || "(none)"}
                  </span>
                  <span className="relative font-mono text-[13px] tabular-nums text-muted-foreground">
                    {point.views}
                  </span>
                  <span className="relative w-8 text-right font-mono text-[13px] tabular-nums text-muted-foreground">
                    {Math.round(share * 100)}%
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
      {data.truncated ? (
        <p className="text-xs text-muted-foreground">Truncated.</p>
      ) : null}
    </div>
  )
}

function BreakdownPanel({
  title,
  tabs,
  tableQueries,
  search,
  onSelect,
}: {
  title: string
  tabs: BreakdownTab[]
  tableQueries: Record<Breakdown, { data: SiteStats }>
  search: SiteSearch
  onSelect: (key: FilterKey, value: string) => void
}) {
  const [active, setActive] = useState(tabs[0]!.key)
  const tab = tabs.find((item) => item.key === active) ?? tabs[0]!
  const table = tableQueries[tab.key]
  const showTabs = tabs.length > 1

  return (
    <section className="rounded-lg border border-border/70 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        {showTabs ? (
          <div
            role="radiogroup"
            aria-label={`${title} breakdown`}
            className="flex h-[26px] items-center gap-0.5 rounded-[7px] bg-muted p-0.5"
          >
            {tabs.map((item) => {
              const selected = item.key === active
              return (
                <button
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setActive(item.key)}
                  className={`h-[22px] shrink-0 rounded-[5px] px-2 text-[12px] leading-4 transition-colors ${
                    selected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>
      <BreakdownTable
        filterKey={tab.filterKey}
        data={table.data}
        activeValue={search[tab.filterKey]}
        onSelect={onSelect}
      />
    </section>
  )
}

export function SitePage() {
  const { slug, siteId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const queryClient = useQueryClient()
  const { range, filters } = statsQueryFromSearch(search)
  const chips = activeFilterChips(search)
  const timeZone = search.tz || "UTC"
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"

  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters)
  )
  const previousTotals = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      undefined,
      previousStatsRange(range),
      filters
    )
  )

  const path = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "path", range, filters)
  )
  const entry = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "entry", range, filters)
  )
  const exit = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "exit", range, filters)
  )
  const referrer = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "referrer", range, filters)
  )
  const country = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "country", range, filters)
  )
  const city = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "city", range, filters)
  )
  const browser = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "browser", range, filters)
  )
  const device = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "device", range, filters)
  )
  const os = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "os", range, filters)
  )
  const screen = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "screen", range, filters)
  )
  const utmSource = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_source", range, filters)
  )
  const utmMedium = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_medium", range, filters)
  )
  const utmCampaign = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_campaign", range, filters)
  )
  const utmContent = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_content", range, filters)
  )
  const utmTerm = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_term", range, filters)
  )
  const tableQueries: Record<Breakdown, { data: SiteStats }> = {
    path,
    entry,
    exit,
    referrer,
    country,
    city,
    browser,
    device,
    os,
    screen,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
  }

  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canReplace =
    role !== null &&
    canManageBusiness(role) &&
    totals.data.site.revokedAt === null
  const [writeKey, setWriteKey] = useState<string | null>(null)

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

  const replace = useMutation({
    mutationFn: () => replaceWriteKey(slug, siteId),
    onSuccess: (result) => {
      setWriteKey(result.writeKey)
    },
  })
  const simulate = useMutation({
    mutationFn: () => simulateSiteViews(slug, siteId),
    onSuccess: async (result) => {
      toast.success(`Inserted ${result.inserted} views`)
      await queryClient.invalidateQueries({
        queryKey: ["site-stats", slug, siteId],
      })
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
              disabled={
                simulate.isPending || totals.data.site.revokedAt !== null
              }
              onClick={() => simulate.mutate()}
            >
              {simulate.isPending ? "Simulating…" : "Simulate views"}
            </Button>
          ) : null}
          {canReplace ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Site actions"
                >
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-40">
                <DropdownMenuItem
                  disabled={replace.isPending}
                  onClick={() => {
                    replace.reset()
                    void replace.mutate()
                  }}
                >
                  {replace.isPending ? "Rotating…" : "Rotate key"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>

      <Dialog
        open={writeKey !== null}
        onOpenChange={(open) => {
          if (!open) setWriteKey(null)
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Write key</DialogTitle>
          </DialogHeader>
          {writeKey ? (
            <InstallSnippet
              label="Write key"
              writeKey={writeKey}
              note="Shown once. The previous key no longer works."
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {replace.error ? (
        <p className="text-sm text-muted-foreground">{replace.error.message}</p>
      ) : null}

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
            onClick={() =>
              patchSearch({
                path: undefined,
                referrer: undefined,
                country: undefined,
                city: undefined,
                browser: undefined,
                device: undefined,
                os: undefined,
                screen: undefined,
                utm_source: undefined,
                utm_medium: undefined,
                utm_campaign: undefined,
                utm_content: undefined,
                utm_term: undefined,
              })
            }
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpiMetrics.map((metric) => {
          const selected = search.metric === metric
          const current = metricValue(totals.data, metric)
          const previous = metricValue(previousTotals.data, metric)
          const delta = changePercent(current, previous)
          return (
            <button
              key={metric}
              type="button"
              onClick={() => patchSearch({ metric: metric as Metric })}
              className={`rounded-xl border px-3 py-3 text-left transition-colors ${selected ? "border-foreground/30 bg-muted/50" : "border-border/80 hover:bg-muted/30"}`}
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
        points={totals.data.points}
        previousPoints={previousTotals.data.points}
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
            tableQueries={tableQueries}
            search={search}
            onSelect={toggleFilter}
          />
        ))}
      </div>
    </div>
  )
}

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { SettingsIcon, SparklesIcon, XIcon } from "lucide-react"
import { Suspense, startTransition } from "react"
import { toast } from "sonner"

import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import { Skeleton } from "@components/ui/skeleton"
import {
  revenueOverviewQueryOptions,
  type RevenueOverview,
} from "@features/revenue/api"
import {
  AttributionPanel,
  MovementsPanel,
  TopCustomersPanel,
} from "@features/revenue/revenue-panels"
import { Segmented } from "@features/revenue/segmented"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import {
  previousStatsRange,
  simulateSiteViews,
  siteStatsQueryOptions,
  statsQueryFromSearch,
  type SiteStats,
  type StatsFilters,
  type StatsRange,
} from "./api"
import { BreakdownPanel } from "./breakdown-panel"
import { DashboardChart } from "./dashboard-chart"
import { KpiCards } from "./kpi-cards"
import { breakdownPanels } from "./panels"
import { RangePicker } from "./range-picker"
import {
  activeFilterChips,
  chartSeriesFor,
  filterKeys,
  filterLabels,
  rangeLabels,
  type FilterKey,
  type SiteSearch,
} from "./search"
import { useRememberedWriteKey } from "./write-key"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId/")

const quickRanges = ["1d", "7d", "30d", "90d", "12m"] as const

function formatStatsRange(start: string, end: string, timeZone: string) {
  const startDate = new Date(start)
  const endDate = new Date(Date.parse(end) - 1)
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

function dependentFilters(key: FilterKey): Partial<SiteSearch> {
  switch (key) {
    case "referrer":
      return { referrer_path: undefined }
    case "event":
      return { prop: undefined, prop_value: undefined }
    case "prop":
      return { prop_value: undefined }
    default:
      return {}
  }
}

export function SitePage() {
  const { slug, siteId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()
  const queryClient = useQueryClient()
  const { range, filters, includeBots } = statsQueryFromSearch(search)
  const timeZone = search.tz || "UTC"
  const previousRange = previousStatsRange(range)

  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters, includeBots)
  )
  const revenue = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, range, filters)
  )

  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role !== null && canManageBusiness(role)
  const site = totals.data.site
  const revoked = site.revokedAt !== null
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
        resetScroll: false,
      })
    })
  }

  function toggleFilter(key: FilterKey, value: string) {
    patchSearch({
      ...dependentFilters(key),
      [key]: search[key] === value ? undefined : value,
    })
  }

  const simulate = useMutation({
    mutationFn: () => simulateSiteViews(slug, siteId),
    onSuccess: async (result) => {
      toast.success(
        `Simulated ${result.inserted.toLocaleString()} pageviews, ${result.signups} signups, and ${result.customers} customers`
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-3xl font-light tracking-tight sm:text-4xl">
            {site.name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              {site.domain}
            </a>
            <span aria-hidden>·</span>
            <span className="font-mono">
              {formatStatsRange(range.start, range.end, timeZone)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {import.meta.env.DEV ? (
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled={simulate.isPending || revoked}
              onClick={() => simulate.mutate()}
            >
              <SparklesIcon data-icon="inline-start" />
              {simulate.isPending ? "Simulating…" : "Simulate data"}
            </Button>
          ) : null}
          <Button asChild variant="outline" size="xs">
            <Link
              to="/businesses/$slug/sites/$siteId/settings"
              params={{ slug, siteId }}
            >
              <SettingsIcon data-icon="inline-start" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {revoked ? (
        <p className="text-sm text-muted-foreground">
          Collection is stopped. New pageviews are not recorded.
        </p>
      ) : null}

      {totals.data.hasEvents ? (
        <Dashboard
          slug={slug}
          siteId={siteId}
          search={search}
          range={range}
          previousRange={previousRange}
          filters={filters}
          includeBots={includeBots}
          timeZone={timeZone}
          totals={totals.data}
          revenue={revenue.data}
          patchSearch={patchSearch}
          toggleFilter={toggleFilter}
        />
      ) : revoked ? (
        <p className="text-sm text-muted-foreground">
          No pageviews were recorded.
        </p>
      ) : (
        <WaitingForViews
          domain={site.domain}
          writeKey={writeKey}
          canManage={canManage}
          slug={slug}
          siteId={siteId}
        />
      )}
    </div>
  )
}

function Toolbar({
  search,
  range,
  timeZone,
  patchSearch,
}: {
  search: SiteSearch
  range: StatsRange
  timeZone: string
  patchSearch: (patch: Partial<SiteSearch>) => void
}) {
  const chips = activeFilterChips(search)
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
  const preset = search.range === "custom" ? null : search.range

  return (
    <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-center gap-2 bg-background/85 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <Segmented
        label="Range"
        options={quickRanges}
        value={preset}
        labels={rangeLabels}
        onChange={(next) =>
          patchSearch({ range: next, from: undefined, to: undefined })
        }
      />
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
        onCustom={(from, to) => patchSearch({ range: "custom", from, to })}
        onTimeZone={(tz) => patchSearch({ tz })}
      />
      <Button
        type="button"
        size="xs"
        variant={search.compare ? "secondary" : "ghost"}
        aria-pressed={search.compare}
        onClick={() =>
          patchSearch({ compare: search.compare ? undefined : true })
        }
      >
        Compare
      </Button>
      <Button
        type="button"
        size="xs"
        variant={search.bots ? "secondary" : "ghost"}
        aria-pressed={search.bots}
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
          onClick={() =>
            patchSearch({
              ...dependentFilters(chip.key),
              [chip.key]: undefined,
            })
          }
        >
          <span className="text-muted-foreground">
            {filterLabels[chip.key]}
          </span>
          {chip.value || "(none)"}
          <XIcon data-icon="inline-end" />
        </Button>
      ))}
      {chips.length > 1 ? (
        <Button
          type="button"
          size="xs"
          variant="ghost"
          onClick={() => patchSearch(clearFiltersPatch())}
        >
          Clear
        </Button>
      ) : null}
    </div>
  )
}

function Dashboard({
  slug,
  siteId,
  search,
  range,
  previousRange,
  filters,
  includeBots,
  timeZone,
  totals,
  revenue,
  patchSearch,
  toggleFilter,
}: {
  slug: string
  siteId: string
  search: SiteSearch
  range: StatsRange
  previousRange: StatsRange
  filters: StatsFilters
  includeBots: boolean
  timeZone: string
  totals: SiteStats
  revenue: RevenueOverview
  patchSearch: (patch: Partial<SiteSearch>) => void
  toggleFilter: (key: FilterKey, value: string) => void
}) {
  const previousTotals = useSuspenseQuery(
    siteStatsQueryOptions(
      slug,
      siteId,
      undefined,
      previousRange,
      filters,
      includeBots
    )
  )
  const previousRevenue = useSuspenseQuery(
    revenueOverviewQueryOptions(slug, siteId, previousRange, filters)
  )
  const { bars, line } = chartSeriesFor(search.metric)
  const revenueContext = {
    enabled: revenue.hasData,
    currency: revenue.currency,
  }

  return (
    <>
      <Toolbar
        search={search}
        range={range}
        timeZone={timeZone}
        patchSearch={patchSearch}
      />

      <KpiCards
        totals={totals}
        previousTotals={previousTotals.data}
        revenue={revenue}
        previousRevenue={previousRevenue.data}
        selected={search.metric}
        onSelect={(metric) => patchSearch({ metric })}
      />

      {revenue.hasData && revenue.ignoredFilters.length > 0 ? (
        <p className="-mt-2 text-xs text-muted-foreground">
          Revenue ignores the{" "}
          {revenue.ignoredFilters
            .map((key) => filterLabels[key].toLowerCase())
            .join(", ")}{" "}
          filter. Signups only record channel, landing page, country, and
          device.
        </p>
      ) : null}

      <DashboardChart
        points={totals.points}
        previousPoints={previousTotals.data.points}
        revenuePoints={revenue.points}
        range={range}
        bars={bars}
        line={line}
        currency={revenue.currency}
        showRevenue={revenue.hasData}
        compare={search.compare}
        timeZone={timeZone}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {breakdownPanels.map((panel) => (
          <BreakdownPanel
            key={panel.id}
            panel={panel}
            slug={slug}
            siteId={siteId}
            range={range}
            filters={filters}
            includeBots={includeBots}
            search={search}
            revenue={revenueContext}
            onSelect={toggleFilter}
          />
        ))}
      </div>

      <section className="flex flex-col gap-3 pt-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-light tracking-tight">Revenue</h2>
          {revenue.otherCurrencies > 0 ? (
            <p className="text-xs text-muted-foreground">
              {revenue.currency.toUpperCase()} only · {revenue.otherCurrencies}{" "}
              other {revenue.otherCurrencies === 1 ? "currency" : "currencies"}{" "}
              hidden
            </p>
          ) : null}
        </div>
        {revenue.hasData ? (
          <>
            <Suspense fallback={<PanelSkeleton />}>
              <AttributionPanel
                slug={slug}
                siteId={siteId}
                range={range}
                filters={filters}
                includeBots={includeBots}
                by={search.by}
                touch={search.touch}
                overview={revenue}
                onChange={patchSearch}
              />
            </Suspense>
            <div className="grid gap-3 md:grid-cols-2">
              <MovementsPanel overview={revenue} />
              <Suspense fallback={<PanelSkeleton />}>
                <TopCustomersPanel slug={slug} siteId={siteId} />
              </Suspense>
            </div>
          </>
        ) : (
          <RevenueSetup
            slug={slug}
            siteId={siteId}
            connected={revenue.connected}
          />
        )}
      </section>
    </>
  )
}

function PanelSkeleton() {
  return <Skeleton className="h-64 rounded-xl" />
}

function RevenueSetup({
  slug,
  siteId,
  connected,
}: {
  slug: string
  siteId: string
  connected: boolean
}) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-dashed border-border p-6 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-lg space-y-1">
        <h3 className="text-[15px] font-medium tracking-tight">
          {connected
            ? "Waiting for revenue"
            : "See which channels bring paying customers"}
        </h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {connected
            ? "Stripe is connected. Run a sync from settings to import customers, subscriptions, and paid invoices."
            : "Call zani.identify() when someone signs up, then connect Stripe with a restricted key. Revenue shows up next to every channel, page, and country."}
        </p>
      </div>
      <Button asChild variant="outline" className="shrink-0">
        <Link
          to="/businesses/$slug/sites/$siteId/settings"
          params={{ slug, siteId }}
          hash="revenue"
        >
          {connected ? "Open settings" : "Set up revenue"}
        </Link>
      </Button>
    </section>
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
    <section className="space-y-4 rounded-xl border border-dashed border-border p-6">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 text-[15px] font-medium tracking-tight">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Waiting for the first pageview
        </h2>
        {writeKey ? (
          <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
            Paste the script on {domain}, then load a page.
            {import.meta.env.DEV
              ? " Or press Simulate data to fill the dashboard with fake traffic and revenue."
              : ""}
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

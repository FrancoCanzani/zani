import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
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
  replaceWriteKey,
  simulateSiteViews,
  siteStatsQueryOptions,
  statsQueryFromSearch,
  type SiteStats,
} from "./api"
import {
  activeFilterChips,
  filterLabels,
  metricLabels,
  rangeLabels,
  rangePresets,
  type FilterKey,
  type Metric,
  type RangePreset,
  type SiteSearch,
} from "./search"
import { ViewsChart } from "./views-chart"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId")

function formatStatsRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  })
  const monthDayYear = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  if (startDate.getFullYear() === endDate.getFullYear()) {
    return `${monthDay.format(startDate)} – ${monthDayYear.format(endDate)}`
  }
  return `${monthDayYear.format(startDate)} – ${monthDayYear.format(endDate)}`
}

function BreakdownTable({
  label,
  filterKey,
  data,
  activeValue,
  onSelect,
}: {
  label: string
  filterKey: FilterKey
  data: SiteStats
  activeValue: string | undefined
  onSelect: (key: FilterKey, value: string) => void
}) {
  const maxViews = Math.max(1, ...data.points.map((point) => point.views))

  return (
    <section className="space-y-3">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <ul className="space-y-1">
        {data.points.length === 0 ? (
          <li className="py-2 text-sm text-muted-foreground">No data</li>
        ) : (
          data.points.map((point) => {
            const value = point.series
            const selected = activeValue === value
            const share = data.views === 0 ? 0 : point.views / data.views
            return (
              <li key={value || "(none)"}>
                <button
                  type="button"
                  onClick={() => onSelect(filterKey, value)}
                  className={`relative flex w-full items-center gap-3 overflow-hidden rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted ${selected ? "bg-muted" : ""}`}
                >
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-foreground/5"
                    style={{ width: `${(point.views / maxViews) * 100}%` }}
                  />
                  <span className="relative min-w-0 flex-1 truncate">
                    {value || "(none)"}
                  </span>
                  <span className="relative tabular-nums text-muted-foreground">
                    {point.views}
                  </span>
                  <span className="relative w-8 text-right tabular-nums text-muted-foreground">
                    {Math.round(share * 100)}%
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
      {data.truncated ? (
        <p className="text-sm text-muted-foreground">Truncated.</p>
      ) : null}
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

  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters)
  )
  const path = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "path", range, filters)
  )
  const referrer = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "referrer", range, filters)
  )

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

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            to="/businesses"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back to sites
          </Link>
          <h1 className="text-4xl font-light tracking-tight">
            {totals.data.site.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {totals.data.site.domain}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatStatsRange(range.start, range.end)}
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
              <DropdownMenuContent align="end">
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

      <div className="flex flex-wrap items-center gap-2">
        {rangePresets.map((preset) => (
          <Button
            key={preset}
            type="button"
            size="xs"
            variant={search.range === preset ? "default" : "outline"}
            onClick={() => patchSearch({ range: preset as RangePreset })}
          >
            {rangeLabels[preset]}
          </Button>
        ))}
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
                browser: undefined,
                device: undefined,
                utm_source: undefined,
                utm_medium: undefined,
                utm_campaign: undefined,
              })
            }
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {(["views", "visitors", "sessions"] as const).map((metric) => {
          const selected = search.metric === metric
          return (
            <button
              key={metric}
              type="button"
              onClick={() => patchSearch({ metric: metric as Metric })}
              className={`rounded-md border px-3 py-3 text-left transition-colors ${selected ? "border-foreground bg-muted/60" : "border-border hover:bg-muted/40"}`}
            >
              <div className="text-sm text-muted-foreground">
                {metricLabels[metric]}
              </div>
              <div className="text-2xl font-light tracking-tight tabular-nums">
                {totals.data[metric]}
              </div>
            </button>
          )
        })}
      </div>

      <ViewsChart
        points={totals.data.points}
        start={range.start}
        end={range.end}
        grain={range.grain}
        metric={search.metric}
      />

      <div className="grid gap-10 md:grid-cols-2">
        <BreakdownTable
          label="Pages"
          filterKey="path"
          data={path.data}
          activeValue={search.path}
          onSelect={toggleFilter}
        />
        <BreakdownTable
          label="Referrers"
          filterKey="referrer"
          data={referrer.data}
          activeValue={search.referrer}
          onSelect={toggleFilter}
        />
      </div>
    </div>
  )
}

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"
import { EllipsisIcon } from "lucide-react"
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
  statsRange,
  type Breakdown,
  type SiteStats,
} from "./api"
import { ViewsChart } from "./views-chart"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/sites/$siteId")

const breakdowns: Array<{ key: Breakdown; label: string }> = [
  { key: "path", label: "Pages" },
  { key: "referrer", label: "Referrers" },
  { key: "country", label: "Countries" },
  { key: "browser", label: "Browsers" },
  { key: "device", label: "Devices" },
  { key: "utm_source", label: "UTM source" },
  { key: "utm_medium", label: "UTM medium" },
  { key: "utm_campaign", label: "UTM campaign" },
]

const ranges = [
  { days: 1, label: "Today" },
  { days: 7, label: "7d" },
  { days: 30, label: "30d" },
] as const

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
  data,
}: {
  label: string
  data: SiteStats
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm text-muted-foreground">{label}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-muted-foreground">
            <th className="py-1 font-normal">value</th>
            <th className="py-1 font-normal">views</th>
            <th className="py-1 font-normal">visitors</th>
            <th className="py-1 font-normal">%</th>
          </tr>
        </thead>
        <tbody>
          {data.points.length === 0 ? (
            <tr className="border-t">
              <td className="py-1 text-muted-foreground" colSpan={4}>
                No data
              </td>
            </tr>
          ) : (
            data.points.map((point) => (
              <tr key={point.series || "(none)"} className="border-t">
                <td className="py-1">{point.series || "(none)"}</td>
                <td className="py-1">{point.views}</td>
                <td className="py-1">{point.visitors}</td>
                <td className="py-1">
                  {data.views === 0
                    ? "0%"
                    : `${Math.round((point.views / data.views) * 100)}%`}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      {data.truncated ? (
        <p className="text-sm text-muted-foreground">Truncated.</p>
      ) : null}
    </section>
  )
}

export function SitePage() {
  const { slug, siteId } = routeApi.useParams()
  const queryClient = useQueryClient()
  const [days, setDays] = useState<(typeof ranges)[number]["days"]>(7)
  const range = statsRange(days)
  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range)
  )
  const path = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "path", range)
  )
  const referrer = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "referrer", range)
  )
  const country = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "country", range)
  )
  const browser = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "browser", range)
  )
  const device = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "device", range)
  )
  const utmSource = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_source", range)
  )
  const utmMedium = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_medium", range)
  )
  const utmCampaign = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, "utm_campaign", range)
  )
  const tables: Record<Breakdown, SiteStats> = {
    path: path.data,
    referrer: referrer.data,
    country: country.data,
    browser: browser.data,
    device: device.data,
    utm_source: utmSource.data,
    utm_medium: utmMedium.data,
    utm_campaign: utmCampaign.data,
  }

  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canReplace =
    role !== null &&
    canManageBusiness(role) &&
    totals.data.site.revokedAt === null
  const [writeKey, setWriteKey] = useState<string | null>(null)
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
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
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
          if (!open) {
            setWriteKey(null)
          }
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

      <div className="flex gap-2">
        {ranges.map((option) => (
          <Button
            key={option.days}
            type="button"
            size="xs"
            variant={days === option.days ? "default" : "outline"}
            onClick={() => {
              startTransition(() => setDays(option.days))
            }}
          >
            {option.label}
          </Button>
        ))}
      </div>

      <dl className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Views</dt>
          <dd className="text-2xl font-light tracking-tight">
            {totals.data.views}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Visitors</dt>
          <dd className="text-2xl font-light tracking-tight">
            {totals.data.visitors}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Sessions</dt>
          <dd className="text-2xl font-light tracking-tight">
            {totals.data.sessions}
          </dd>
        </div>
      </dl>

      <ViewsChart
        points={totals.data.points}
        start={range.start}
        end={range.end}
        grain={range.grain}
      />

      <div className="grid gap-10 md:grid-cols-2">
        {breakdowns.map(({ key, label }) => (
          <BreakdownTable key={key} label={label} data={tables[key]} />
        ))}
      </div>
    </div>
  )
}

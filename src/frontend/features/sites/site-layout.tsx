import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router"
import { SettingsIcon, SparklesIcon } from "lucide-react"
import { startTransition, useEffect } from "react"
import { toast } from "sonner"

import { Button } from "@components/ui/button"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import {
  simulateSiteViews,
  siteSetupQueryOptions,
  siteStatsQueryOptions,
} from "./api"
import { LivePill } from "./live-dashboard"
import { SiteNav } from "./site-nav"
import { Toolbar } from "./toolbar"
import { useSiteSearch } from "./use-site-search"

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

export function SiteLayout() {
  const {
    slug,
    siteId,
    search,
    range,
    filters,
    includeBots,
    timeZone,
    patchSearch,
  } = useSiteSearch()
  const navigate = useNavigate()
  const onTraffic = useMatch({
    from: "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/",
    shouldThrow: false,
  })
  const queryClient = useQueryClient()

  const totals = useSuspenseQuery(
    siteStatsQueryOptions(slug, siteId, undefined, range, filters, includeBots)
  )
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role !== null && canManageBusiness(role)
  const site = totals.data.site
  const revoked = site.revokedAt !== null

  function toggleLive() {
    startTransition(() => {
      void navigate({
        to: "/businesses/$slug/sites/$siteId",
        params: { slug, siteId },
        search: (prev) => ({ ...prev, live: !search.live }),
        resetScroll: false,
      })
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
        queryClient.invalidateQueries({
          queryKey: ["activity", slug, siteId],
        }),
      ])
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="flex flex-col gap-6 pb-20">
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
              {search.live
                ? "Last 30 minutes"
                : formatStatsRange(range.start, range.end, timeZone)}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {totals.data.hasEvents && !revoked ? (
            <LivePill
              slug={slug}
              siteId={siteId}
              active={search.live}
              onToggle={toggleLive}
            />
          ) : null}
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
        <>
          <Toolbar
            search={search}
            range={range}
            timeZone={timeZone}
            showCompare={onTraffic !== undefined}
            patchSearch={patchSearch}
          />
          <Outlet />
          <SiteNav slug={slug} siteId={siteId} />
        </>
      ) : revoked ? (
        <p className="text-sm text-muted-foreground">
          No pageviews were recorded.
        </p>
      ) : (
        <WaitingForViews
          domain={site.domain}
          canManage={canManage}
          slug={slug}
          siteId={siteId}
        />
      )}
    </div>
  )
}

const waitPollMs = 4_000

function WaitingForViews({
  domain,
  canManage,
  slug,
  siteId,
}: {
  domain: string
  canManage: boolean
  slug: string
  siteId: string
}) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    ...siteSetupQueryOptions(slug, siteId),
    refetchInterval: (query) =>
      query.state.data?.setup.firstPageviewAt ? false : waitPollMs,
  })
  const installed = Boolean(data?.setup.firstPageviewAt)

  useEffect(() => {
    if (!installed) return
    void queryClient.invalidateQueries({
      queryKey: ["site-stats", slug, siteId],
    })
  }, [installed, queryClient, slug, siteId])

  return (
    <section className="flex flex-col items-center justify-center gap-5 rounded-xl border border-dashed border-border/80 px-6 py-16 text-center sm:py-20">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span aria-hidden className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
        Listening for {domain}
      </div>
      <div className="max-w-md space-y-2">
        <h2 className="text-xl font-medium tracking-tight sm:text-2xl">
          Waiting for the first pageview
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Once the tracking script is on your site, traffic shows up here
          automatically. Need the snippet again? Open install settings to copy
          or rotate the write key.
        </p>
      </div>
      {canManage ? (
        <Button asChild variant="outline">
          <Link
            to="/businesses/$slug/sites/$siteId/settings"
            params={{ slug, siteId }}
            hash="install"
          >
            Install instructions
          </Link>
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground">
          An owner or admin can reconnect the script from Settings.
        </p>
      )}
    </section>
  )
}

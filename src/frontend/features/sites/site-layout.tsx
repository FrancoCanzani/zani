import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router"
import { Hashvatar } from "hashvatar/react"
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
  const startYear = Number(
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(
      startDate
    )
  )
  const endYear = Number(
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(
      endDate
    )
  )
  const nowYear = Number(
    new Intl.DateTimeFormat("en", { timeZone, year: "numeric" }).format(
      new Date()
    )
  )
  const monthDay = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone,
  })
  if (startYear === endYear) {
    const span = `${monthDay.format(startDate)}–${monthDay.format(endDate)}`
    return startYear === nowYear ? span : `${span} ${endYear}`
  }
  const withYear = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "2-digit",
    timeZone,
  })
  return `${withYear.format(startDate)}–${withYear.format(endDate)}`
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
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate text-3xl font-light tracking-tight sm:text-4xl">
            {site.name}
          </h1>
          <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-foreground">
            <a
              href={`https://${site.domain}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-foreground hover:underline"
            >
              {site.domain}
            </a>
            <span aria-hidden className="text-muted-foreground/50">
              ·
            </span>
            <span>
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
    <section className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
      <div className="flex flex-col items-center gap-6">
        <div className="relative flex size-28 items-center justify-center">
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-foreground/5 [animation-duration:2.4s]"
          />
          <span
            aria-hidden
            className="absolute inset-3 rounded-full bg-foreground/[0.04]"
          />
          <Hashvatar
            hash={domain}
            size={88}
            animated
            className="relative size-[88px] shadow-lg shadow-black/10"
          />
        </div>
        <div className="max-w-xs space-y-2">
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            Listening
          </p>
          <h2 className="text-xl font-medium tracking-tight">
            Waiting for the first pageview
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Traffic from {domain} shows up here once the script is live.
          </p>
        </div>
        {canManage ? (
          <Button asChild variant="ghost" size="sm">
            <Link
              to="/businesses/$slug/sites/$siteId/settings"
              params={{ slug, siteId }}
              hash="install"
            >
              Get the script
            </Link>
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Ask an owner to reconnect the script in Settings.
          </p>
        )}
      </div>
    </section>
  )
}

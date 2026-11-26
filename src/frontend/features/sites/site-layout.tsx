import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router"
import { Hashvatar } from "hashvatar/react"
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
  const hasDashboard = totals.data.hasEvents && !revoked

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
    <div className="flex min-h-0 flex-1 flex-col gap-5">
      <div className="sticky top-14 z-10 -mx-4 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="truncate text-lg font-medium tracking-tight">
              <a
                href={`https://${site.domain}`}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {site.domain}
              </a>
            </h1>
            {hasDashboard ? (
              <LivePill
                slug={slug}
                siteId={siteId}
                active={search.live}
                onToggle={toggleLive}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            {hasDashboard ? (
              <Toolbar
                search={search}
                range={range}
                timeZone={timeZone}
                showCompare={onTraffic !== undefined}
                patchSearch={patchSearch}
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
                {simulate.isPending ? "Simulating…" : "Simulate data"}
              </Button>
            ) : null}
            <Button asChild variant="outline" size="xs">
              <Link
                to="/businesses/$slug/sites/$siteId/settings"
                params={{ slug, siteId }}
              >
                Settings
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {revoked ? (
        <p className="text-sm text-muted-foreground">
          Collection is stopped. New pageviews are not recorded.
        </p>
      ) : null}

      {totals.data.hasEvents ? (
        <>
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
        <Hashvatar
          hash={domain}
          size={88}
          animated
          tones={["#2563eb", "#0ea5e9", "#38bdf8"]}
          className="size-[88px] shadow-lg shadow-sky-900/10"
        />
        <div className="max-w-xs space-y-2">
          <p className="text-sm text-muted-foreground">Listening</p>
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

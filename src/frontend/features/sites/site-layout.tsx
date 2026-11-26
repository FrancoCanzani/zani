import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router"
import { SettingsIcon, SparklesIcon } from "lucide-react"
import { startTransition } from "react"
import { toast } from "sonner"

import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"

import { simulateSiteViews, siteStatsQueryOptions } from "./api"
import { InstallStatus } from "./install-status"
import { LivePill } from "./live-dashboard"
import { SiteNav } from "./site-nav"
import { Toolbar } from "./toolbar"
import { useSiteSearch } from "./use-site-search"
import { useRememberedWriteKey } from "./write-key"

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
    goal,
    timeZone,
    patchSearch,
  } = useSiteSearch()
  const navigate = useNavigate()
  const onOverview = useMatch({
    from: "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard/",
    shouldThrow: false,
  })
  const queryClient = useQueryClient()

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
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role !== null && canManageBusiness(role)
  const site = totals.data.site
  const revoked = site.revokedAt !== null
  const { writeKey } = useRememberedWriteKey(siteId)

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
            showCompare={onOverview !== undefined}
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
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-6">
      <div className="space-y-2">
        <h2 className="text-[15px] font-medium tracking-tight">
          Install the script
        </h2>
        <InstallStatus slug={slug} siteId={siteId} domain={domain} />
        <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
          Only pageviews from {domain} count. Testing on localhost or a preview
          URL? Those are ignored, and the browser console says so.
        </p>
        {writeKey ? (
          import.meta.env.DEV ? (
            <p className="text-sm text-muted-foreground">
              Or press Simulate data to fill the dashboard with fake traffic and
              revenue.
            </p>
          ) : null
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

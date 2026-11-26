import {
  infiniteQueryOptions,
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

import { defaultPanelBreakdowns, type Breakdown } from "./panels"
import {
  filtersFromSearch,
  liveTickMs,
  rangeFromSearch,
  type FilterKey,
  type Grain,
  type StatsSearch,
} from "./search"

export type Site = {
  id: string
  name: string
  domain: string
  createdAt: number
  revokedAt: number | null
  hasSecretKey: boolean
}

export type StatsPoint = {
  bucket: number | null
  series: string
  views: number
  visitors: number
  sessions: number
  conversions: number
}

export type SiteStats = {
  site: {
    id: string
    name: string
    domain: string
    revokedAt: number | null
  }
  views: number
  visitors: number
  sessions: number
  bounceRate: number
  viewsPerVisit: number
  conversions: number
  hasEvents: boolean
  truncated: boolean
  points: StatsPoint[]
}

export type SiteGoal = {
  key: string
  kind: "event" | "signup" | "paid"
  name: string
  conversions: number
  completions: number
}

export type FunnelStep =
  | { type: "page"; path: string }
  | { type: "event"; name: string }
  | { type: "signup" }
  | { type: "paid" }

export type Funnel = {
  id: string
  name: string
  steps: FunnelStep[]
  createdAt: number
  updatedAt: number
}

export type StatsRange = {
  start: string
  end: string
  grain: Grain
  tz?: string
}

export type StatsFilters = Partial<Record<FilterKey, string>>

type StatsQuery = {
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
  goal?: string
}

const statsStaleMs = 30_000

export function accountSitesQueryOptions() {
  return queryOptions({
    queryKey: ["account-sites"] as const,
    queryFn: async () => {
      const { workspaces } = await requireJson<{
        workspaces: Array<{ slug: string }>
      }>(await api.workspaces.$get(), "workspaces")
      const groups = await Promise.all(
        workspaces.map(async (workspace) => {
          const { sites } = await requireJson<{ sites: Site[] }>(
            await api.workspaces[":slug"].sites.$get({
              param: { slug: workspace.slug },
            }),
            "sites"
          )
          return sites.map((site) => ({ ...site, slug: workspace.slug }))
        })
      )
      return groups.flat()
    },
  })
}

export type SiteSummary = {
  siteId: string
  visitors: number
  previousVisitors: number
  mrr: { currency: string; value: number; previous: number } | null
}

export function sitesSummaryQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["sites-summary", slug] as const,
    queryFn: async () =>
      (
        await requireJson<{ sites: SiteSummary[] }>(
          await api.workspaces[":slug"].sites.summary.$get({
            param: { slug },
          }),
          "sites"
        )
      ).sites,
    staleTime: statsStaleMs,
  })
}

export function sitesQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["sites", slug] as const,
    queryFn: async () =>
      requireJson<{ sites: Site[] }>(
        await api.workspaces[":slug"].sites.$get({
          param: { slug },
        }),
        "sites"
      ),
  })
}

export function rangeQuery(range: StatsRange, filters: StatsFilters) {
  return {
    start: range.start,
    end: range.end,
    ...(range.tz ? { tz: range.tz } : {}),
    ...filters,
  }
}

export function siteStatsQueryOptions(
  slug: string,
  siteId: string,
  breakdown: Breakdown | undefined,
  range: StatsRange,
  filters: StatsFilters = {},
  includeBots = false,
  goal?: string
) {
  return queryOptions({
    queryKey: [
      "site-stats",
      slug,
      siteId,
      breakdown ?? "total",
      range,
      filters,
      includeBots,
      goal ?? "",
    ] as const,
    queryFn: async () =>
      requireJson<SiteStats>(
        await api.workspaces[":slug"].sites[":siteId"].stats.$get({
          param: { slug, siteId },
          query: {
            ...rangeQuery(range, filters),
            grain: range.grain,
            ...(breakdown ? { breakdown } : {}),
            ...(includeBots ? { bots: "1" as const } : {}),
            ...(goal ? { goal } : {}),
          },
        }),
        "views"
      ),
    staleTime: statsStaleMs,
    placeholderData: keepPreviousData,
  })
}

export function siteGoalsQueryOptions(
  slug: string,
  siteId: string,
  range: StatsRange,
  filters: StatsFilters = {},
  includeBots = false
) {
  return queryOptions({
    queryKey: ["site-goals", slug, siteId, range, filters, includeBots] as const,
    queryFn: async () =>
      requireJson<{ visitors: number; goals: SiteGoal[] }>(
        await api.workspaces[":slug"].sites[":siteId"].goals.$get({
          param: { slug, siteId },
          query: {
            ...rangeQuery(range, filters),
            ...(includeBots ? { bots: "1" as const } : {}),
          },
        }),
        "goals"
      ),
    staleTime: statsStaleMs,
    placeholderData: keepPreviousData,
  })
}

export function funnelsQueryOptions(slug: string, siteId: string) {
  return queryOptions({
    queryKey: ["funnels", slug, siteId] as const,
    queryFn: async () =>
      requireJson<{ funnels: Funnel[] }>(
        await api.workspaces[":slug"].sites[":siteId"].funnels.$get({
          param: { slug, siteId },
        }),
        "funnels"
      ),
  })
}

export function funnelResultsQueryOptions(
  slug: string,
  siteId: string,
  funnelId: string,
  range: StatsRange,
  filters: StatsFilters,
  includeBots: boolean
) {
  return queryOptions({
    queryKey: [
      "funnel-results",
      slug,
      siteId,
      funnelId,
      range,
      filters,
      includeBots,
    ] as const,
    queryFn: async () =>
      requireJson<{
        funnel: Funnel
        steps: Array<{ step: FunnelStep; visitors: number }>
      }>(
        await api.workspaces[":slug"].sites[":siteId"].funnels[
          ":funnelId"
        ].results.$get({
          param: { slug, siteId, funnelId },
          query: {
            ...rangeQuery(range, filters),
            ...(includeBots ? { bots: "1" as const } : {}),
          },
        }),
        "steps"
      ),
    staleTime: statsStaleMs,
    placeholderData: keepPreviousData,
  })
}

export async function createFunnel(
  slug: string,
  siteId: string,
  body: { name: string; steps: FunnelStep[] }
) {
  const response = await api.workspaces[":slug"].sites[":siteId"].funnels.$post(
    {
      param: { slug, siteId },
      json: body,
    }
  )
  if (response.status === 403) throw new Error("You cannot edit funnels.")
  if (response.status === 409) throw new Error("This site already has 20 funnels.")
  if (!response.ok) throw new Error("Could not create the funnel.")
  return requireJson<{ funnel: Funnel }>(response, "funnel")
}

export async function updateFunnel(
  slug: string,
  siteId: string,
  funnelId: string,
  body: { name: string; steps: FunnelStep[] }
) {
  const response = await api.workspaces[":slug"].sites[":siteId"].funnels[
    ":funnelId"
  ].$patch({
    param: { slug, siteId, funnelId },
    json: body,
  })
  if (response.status === 403) throw new Error("You cannot edit funnels.")
  if (response.status === 404) throw new Error("Funnel not found.")
  if (!response.ok) throw new Error("Could not save the funnel.")
  return requireJson<{ funnel: Funnel }>(response, "funnel")
}

export async function deleteFunnel(
  slug: string,
  siteId: string,
  funnelId: string
) {
  const response = await api.workspaces[":slug"].sites[":siteId"].funnels[
    ":funnelId"
  ].$delete({
    param: { slug, siteId, funnelId },
  })
  if (response.status === 403) throw new Error("You cannot edit funnels.")
  if (response.status === 404) throw new Error("Funnel not found.")
  if (!response.ok) throw new Error("Could not delete the funnel.")
}

export async function replaceSecretKey(slug: string, siteId: string) {
  const response = await api.workspaces[":slug"].sites[":siteId"][
    "secret-key"
  ].$post({
    param: { slug, siteId },
  })
  if (response.status === 403) {
    throw new Error("You cannot replace this secret key.")
  }
  if (response.status === 409) {
    throw new Error("This site is revoked.")
  }
  if (!response.ok) {
    throw new Error("Could not replace the secret key.")
  }
  return requireJson<{ site: Site; secretKey: string }>(response, "secretKey")
}

export async function createSite(
  slug: string,
  body: { name: string; domain: string }
) {
  const response = await api.workspaces[":slug"].sites.$post({
    param: { slug },
    json: body,
  })
  if (response.status === 403) {
    throw new Error("You cannot add a site.")
  }
  if (!response.ok) {
    throw new Error("Could not add the site.")
  }
  return requireJson<{ site: Site; writeKey: string }>(response, "site")
}

export async function replaceWriteKey(slug: string, siteId: string) {
  const response = await api.workspaces[":slug"].sites[":siteId"][
    "write-key"
  ].$post({
    param: { slug, siteId },
  })
  if (response.status === 403) {
    throw new Error("You cannot replace this write key.")
  }
  if (response.status === 409) {
    throw new Error("This site is revoked.")
  }
  if (!response.ok) {
    throw new Error("Could not replace the write key.")
  }
  return requireJson<{ site: Site; writeKey: string }>(response, "writeKey")
}

export async function updateSite(
  slug: string,
  siteId: string,
  body: { name?: string; domain?: string }
) {
  const response = await api.workspaces[":slug"].sites[":siteId"].$patch({
    param: { slug, siteId },
    json: body,
  })
  if (response.status === 403) {
    throw new Error("You cannot edit this site.")
  }
  if (!response.ok) {
    throw new Error("Could not save the site.")
  }
  return requireJson<{ site: Site }>(response, "site")
}

export async function revokeSite(slug: string, siteId: string) {
  const response = await api.workspaces[":slug"].sites[":siteId"].revoke.$post({
    param: { slug, siteId },
  })
  if (response.status === 403) {
    throw new Error("You cannot revoke this site.")
  }
  if (!response.ok) {
    throw new Error("Could not revoke the site.")
  }
  return requireJson<{ site: Site }>(response, "site")
}

export type SiteSetup = {
  firstPageviewAt: number | null
  firstPageviewPath: string | null
  lastPageviewAt: number | null
  signups: number
  firstIdentifyAt: number | null
  lastIdentifyAt: number | null
  linkedCustomers: number
}

export function siteSetupQueryOptions(slug: string, siteId: string) {
  return queryOptions({
    queryKey: ["site-setup", slug, siteId] as const,
    queryFn: async () =>
      requireJson<{ setup: SiteSetup }>(
        await api.workspaces[":slug"].sites[":siteId"].setup.$get({
          param: { slug, siteId },
        }),
        "setup"
      ),
  })
}

export async function simulateSiteViews(slug: string, siteId: string) {
  const response = await api.workspaces[":slug"].sites[
    ":siteId"
  ].simulate.$post({
    param: { slug, siteId },
  })
  if (response.status === 404) {
    throw new Error("Simulate is only available in development.")
  }
  if (response.status === 409) {
    throw new Error("This site is revoked.")
  }
  if (!response.ok) {
    throw new Error("Could not simulate views.")
  }
  return requireJson<{ inserted: number; signups: number; customers: number }>(
    response,
    "inserted"
  )
}

export function statsQueryFromSearch(search: StatsSearch): StatsQuery {
  const range = rangeFromSearch(search)
  return {
    range: { ...range, tz: search.tz },
    filters: filtersFromSearch(search),
    includeBots: Boolean(search.bots),
    goal: search.goal,
  }
}

export function previousStatsRange(range: StatsRange): StatsRange {
  const startMs = Date.parse(range.start)
  const endMs = Date.parse(range.end)
  const duration = Math.max(0, endMs - startMs)
  return {
    start: new Date(startMs - duration).toISOString(),
    end: new Date(startMs).toISOString(),
    grain: range.grain,
    tz: range.tz,
  }
}

export function changePercent(
  current: number,
  previous: number
): number | null {
  if (previous <= 0) return current > 0 ? 100 : current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export async function preloadSiteStats(
  queryClient: QueryClient,
  slug: string,
  siteId: string,
  search: StatsSearch
) {
  const { range, filters, includeBots } = statsQueryFromSearch(search)
  const previous = previousStatsRange(range)
  const goal = search.goal
  await Promise.all([
    queryClient.query(
      siteStatsQueryOptions(
        slug,
        siteId,
        undefined,
        range,
        filters,
        includeBots,
        goal
      )
    ),
    queryClient.query(
      siteStatsQueryOptions(
        slug,
        siteId,
        undefined,
        previous,
        filters,
        includeBots,
        goal
      )
    ),
    ...defaultPanelBreakdowns.map((breakdown) =>
      queryClient.query(
        siteStatsQueryOptions(
          slug,
          siteId,
          breakdown,
          range,
          filters,
          includeBots,
          goal
        )
      )
    ),
  ])
}

export function siteOnlineQueryOptions(slug: string, siteId: string) {
  return queryOptions({
    queryKey: ["site-online", slug, siteId] as const,
    queryFn: async () =>
      requireJson<{ online: number }>(
        await api.workspaces[":slug"].sites[":siteId"].online.$get({
          param: { slug, siteId },
        }),
        "online"
      ),
    refetchInterval: liveTickMs,
    refetchIntervalInBackground: false,
  })
}

export const activityTypes = ["all", "pageviews", "signups", "revenue"] as const

export type ActivityType = (typeof activityTypes)[number]

export type ActivityItem =
  | {
      kind: "pageview" | "event"
      id: string
      at: number
      name: string
      path: string
      source: string
      referrer: string
      country: string
      city: string
      browser: string
      device: string
    }
  | {
      kind: "signup"
      id: string
      at: number
      firstSource: string
      lastSource: string
      landing: string
      country: string
      firstSeenAt: number
    }
  | {
      kind: "revenue"
      id: string
      at: number
      movement: "new" | "expansion" | "contraction" | "churn" | "reactivation"
      amount: number
      mrrAfter: number
      currency: string
      customer: string
      firstSource: string | null
      firstSeenAt: number | null
    }

type ActivityPage = { items: ActivityItem[]; nextBefore: number | null }

export function activityQueryOptions(
  slug: string,
  siteId: string,
  type: ActivityType,
  range: StatsRange,
  filters: StatsFilters,
  includeBots: boolean
) {
  return infiniteQueryOptions({
    queryKey: [
      "activity",
      slug,
      siteId,
      type,
      range,
      filters,
      includeBots,
    ] as const,
    queryFn: async ({ pageParam }) =>
      (
        await requireJson<{ activity: ActivityPage }>(
          await api.workspaces[":slug"].sites[":siteId"].activity.$get({
            param: { slug, siteId },
            query: {
              ...rangeQuery(range, filters),
              type,
              ...(includeBots ? { bots: "1" as const } : {}),
              ...(pageParam === null ? {} : { before: String(pageParam) }),
            },
          }),
          "activity"
        )
      ).activity,
    initialPageParam: null as number | null,
    getNextPageParam: (page) => page.nextBefore,
    staleTime: statsStaleMs,
  })
}

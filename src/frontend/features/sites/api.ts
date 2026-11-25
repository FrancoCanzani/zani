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
  type SiteSearch,
} from "./search"

export type { Breakdown }

export type Site = {
  id: string
  name: string
  domain: string
  createdAt: number
  revokedAt: number | null
}

export type StatsPoint = {
  bucket: number | null
  series: string
  views: number
  visitors: number
  sessions: number
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
  hasEvents: boolean
  truncated: boolean
  points: StatsPoint[]
}

export type StatsRange = {
  start: string
  end: string
  grain: Grain
  tz?: string
}

export type StatsFilters = Partial<Record<FilterKey, string>>

export type StatsQuery = {
  range: StatsRange
  filters: StatsFilters
  includeBots: boolean
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

export function siteStatsQueryOptions(
  slug: string,
  siteId: string,
  breakdown: Breakdown | undefined,
  range: StatsRange,
  filters: StatsFilters = {},
  includeBots = false
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
    ] as const,
    queryFn: async () =>
      requireJson<SiteStats>(
        await api.workspaces[":slug"].sites[":siteId"].stats.$get({
          param: { slug, siteId },
          query: {
            start: range.start,
            end: range.end,
            grain: range.grain,
            ...(range.tz ? { tz: range.tz } : {}),
            ...(breakdown ? { breakdown } : {}),
            ...(includeBots ? { bots: "1" as const } : {}),
            ...filters,
          },
        }),
        "views"
      ),
    staleTime: statsStaleMs,
    placeholderData: keepPreviousData,
  })
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

export function statsQueryFromSearch(search: SiteSearch): StatsQuery {
  const range = rangeFromSearch(search)
  return {
    range: { ...range, tz: search.tz },
    filters: filtersFromSearch(search),
    includeBots: Boolean(search.bots),
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
  search: SiteSearch
) {
  const { range, filters, includeBots } = statsQueryFromSearch(search)
  const previous = previousStatsRange(range)
  await Promise.all([
    queryClient.query({
      ...siteStatsQueryOptions(
        slug,
        siteId,
        undefined,
        range,
        filters,
        includeBots
      ),
      staleTime: statsStaleMs,
    }),
    queryClient.query({
      ...siteStatsQueryOptions(
        slug,
        siteId,
        undefined,
        previous,
        filters,
        includeBots
      ),
      staleTime: statsStaleMs,
    }),
    ...defaultPanelBreakdowns.map((breakdown) =>
      queryClient.query({
        ...siteStatsQueryOptions(
          slug,
          siteId,
          breakdown,
          range,
          filters,
          includeBots
        ),
        staleTime: statsStaleMs,
      })
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
              start: range.start,
              end: range.end,
              type,
              ...(range.tz ? { tz: range.tz } : {}),
              ...(includeBots ? { bots: "1" as const } : {}),
              ...(pageParam === null ? {} : { before: String(pageParam) }),
              ...filters,
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

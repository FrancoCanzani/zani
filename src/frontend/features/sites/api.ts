import {
  keepPreviousData,
  queryOptions,
  type QueryClient,
} from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

import { defaultPanelBreakdowns, type Breakdown } from "./panels"
import {
  filtersFromSearch,
  rangeFromSearch,
  type FilterKey,
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
  grain: "hour" | "day"
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

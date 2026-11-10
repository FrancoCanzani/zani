import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

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
  }
  views: number
  visitors: number
  sessions: number
  truncated: boolean
  points: StatsPoint[]
}

export type Breakdown = "path" | "referrer" | "country"

const weekMs = 7 * 24 * 60 * 60 * 1000

export function statsRange() {
  const endMs = Math.ceil(Date.now() / 3_600_000) * 3_600_000
  const startMs = endMs - weekMs
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  }
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
  range: { start: string; end: string }
) {
  return queryOptions({
    queryKey: [
      "site-stats",
      slug,
      siteId,
      breakdown ?? "total",
      range,
    ] as const,
    queryFn: async () =>
      requireJson<SiteStats>(
        await api.workspaces[":slug"].sites[":siteId"].stats.$get({
          param: { slug, siteId },
          query: {
            start: range.start,
            end: range.end,
            grain: "day",
            ...(breakdown ? { breakdown } : {}),
          },
        }),
        "views"
      ),
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

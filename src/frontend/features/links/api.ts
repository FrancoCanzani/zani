import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

export type LinkSummary = {
  id: string
  code: string
  name: string | null
  destinationUrl: string
  createdAt: number
}

export function linksQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["links", slug] as const,
    queryFn: async () =>
      requireJson<{ links: LinkSummary[] }>(
        await api.workspaces[":slug"].links.$get({
          param: { slug },
        }),
        "links"
      ),
  })
}

export function linkQueryOptions(slug: string, code: string) {
  return queryOptions({
    queryKey: ["links", slug, code] as const,
    queryFn: async () =>
      requireJson<{
        link: LinkSummary
        clicks: number
        recent: Array<{
          id: string
          occurredAt: number
          country: string | null
          referrerHost: string
          device: string
          browser: string
        }>
      }>(
        await api.workspaces[":slug"].links[":code"].$get({
          param: { slug, code },
        }),
        "link"
      ),
  })
}

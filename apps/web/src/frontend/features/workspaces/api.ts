import { queryOptions } from "@tanstack/react-query"

import { api, requireJson } from "@lib/api"

export function workspacesQueryOptions() {
  return queryOptions({
    queryKey: ["workspaces"] as const,
    queryFn: async () =>
      requireJson<{
        workspaces: Array<{
          id: string
          name: string
          slug: string
          plan: string
          role: string
          createdAt: number
        }>
      }>(await api.workspaces.$get(), "workspaces"),
  })
}

export function workspaceQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["workspace", slug] as const,
    queryFn: async () =>
      requireJson<{
        workspace: {
          id: string
          name: string
          slug: string
          plan: string
          role: string
          createdAt: number
        }
      }>(
        await api.workspaces[":slug"].$get({
          param: { slug },
        }),
        "workspace"
      ),
  })
}

export function workspaceMembersQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["workspace", slug, "members"] as const,
    queryFn: async () =>
      requireJson<{
        members: Array<{
          id: string
          role: string
          email: string
          name: string
        }>
      }>(
        await api.workspaces[":slug"].members.$get({
          param: { slug },
        }),
        "members"
      ),
  })
}

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

export type Workspace = {
  id: string
  name: string
  slug: string
  plan: string
  role: string
  createdAt: number
}

export type WorkspaceDetailsInput = {
  name?: string
}

export function workspaceQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["workspace", slug] as const,
    queryFn: async () =>
      requireJson<{ workspace: Workspace }>(
        await api.workspaces[":slug"].$get({
          param: { slug },
        }),
        "workspace"
      ),
  })
}

export async function updateWorkspace(
  slug: string,
  body: WorkspaceDetailsInput
) {
  const response = await api.workspaces[":slug"].$patch({
    param: { slug },
    json: body,
  })
  if (response.status === 403) {
    throw new Error("You cannot update this.")
  }
  if (!response.ok) {
    throw new Error("Could not save.")
  }
  return requireJson<{ workspace: Workspace }>(response, "workspace")
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

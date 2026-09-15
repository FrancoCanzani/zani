import { queryOptions } from "@tanstack/react-query"
import { notFound, redirect } from "@tanstack/react-router"

import { api } from "./api"

async function requireJson<T extends Record<string, unknown>>(
  response: { ok: boolean; status: number; json: () => Promise<unknown> },
  key: keyof T & string
): Promise<T> {
  if (response.status === 401) {
    throw redirect({ to: "/sign-in" })
  }
  if (response.status === 404) {
    throw notFound()
  }
  if (!response.ok) {
    throw new Error("Request failed")
  }
  const body = await response.json()
  if (!body || typeof body !== "object" || !(key in body)) {
    throw new Error("Request failed")
  }
  return body as T
}

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

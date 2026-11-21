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

export type WorkspaceInvite = {
  id: string
  email: string
  role: string
  expiresAt: number
}

export function workspaceInvitesQueryOptions(slug: string) {
  return queryOptions({
    queryKey: ["workspace", slug, "invites"] as const,
    queryFn: async () =>
      requireJson<{ invites: WorkspaceInvite[] }>(
        await api.workspaces[":slug"].invites.$get({
          param: { slug },
        }),
        "invites"
      ),
  })
}

export async function sendInvite(
  slug: string,
  body: { email: string; role: "member" | "admin" }
) {
  const response = await api.workspaces[":slug"].invites.$post({
    param: { slug },
    json: body,
  })
  if (response.status === 409) {
    throw new Error("That person is already a member.")
  }
  if (response.status === 403) {
    throw new Error("You cannot invite members.")
  }
  if (!response.ok) {
    throw new Error("Could not send the invite.")
  }
}

export async function cancelInvite(slug: string, inviteId: string) {
  const response = await api.workspaces[":slug"].invites[":inviteId"].$delete({
    param: { slug, inviteId },
  })
  if (response.status === 403) {
    throw new Error("You cannot cancel this invite.")
  }
  if (!response.ok) {
    throw new Error("Could not cancel the invite.")
  }
}

export async function updateMemberRole(
  slug: string,
  memberId: string,
  role: "member" | "admin"
) {
  const response = await api.workspaces[":slug"].members[":memberId"].$patch({
    param: { slug, memberId },
    json: { role },
  })
  if (response.status === 403) {
    throw new Error("You cannot change this role.")
  }
  if (!response.ok) {
    throw new Error("Could not change the role.")
  }
}

export async function removeMember(slug: string, memberId: string) {
  const response = await api.workspaces[":slug"].members[":memberId"].$delete({
    param: { slug, memberId },
  })
  if (response.status === 409) {
    throw new Error("Add another owner before you leave.")
  }
  if (response.status === 403) {
    throw new Error("You cannot remove this person.")
  }
  if (!response.ok) {
    throw new Error("Could not remove this person.")
  }
}

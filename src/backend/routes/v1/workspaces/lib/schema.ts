import { z } from "zod"

export const inviteRoleSchema = z.enum(["member", "admin"])

export const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const updateWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
})

export const createInviteBodySchema = z.object({
  email: z.email(),
  role: inviteRoleSchema.default("member"),
})

export type InviteRole = z.infer<typeof inviteRoleSchema>
export type WorkspaceRole = InviteRole | "owner"

export function parseWorkspaceRole(role: string): WorkspaceRole | null {
  switch (role) {
    case "owner":
    case "admin":
    case "member":
      return role
    default:
      return null
  }
}

export function canManageBusiness(role: WorkspaceRole) {
  switch (role) {
    case "owner":
    case "admin":
      return true
    case "member":
      return false
    default: {
      const exhaustive: never = role
      return exhaustive
    }
  }
}

export function canInvite(role: WorkspaceRole) {
  return canManageBusiness(role)
}

export function canSetMemberRole(actor: WorkspaceRole, target: WorkspaceRole) {
  switch (actor) {
    case "owner":
      return target === "admin" || target === "member"
    case "admin":
      return target === "member"
    case "member":
      return false
    default: {
      const exhaustive: never = actor
      return exhaustive
    }
  }
}

export function canRemoveMember(
  actor: WorkspaceRole,
  target: WorkspaceRole,
  isSelf: boolean,
  ownerCount: number
) {
  if (isSelf) {
    if (target === "owner") {
      return ownerCount > 1
    }
    return true
  }
  switch (actor) {
    case "owner":
      return target !== "owner"
    case "admin":
      return target === "member"
    case "member":
      return false
    default: {
      const exhaustive: never = actor
      return exhaustive
    }
  }
}

export const updateMemberBodySchema = z.object({
  role: inviteRoleSchema,
})

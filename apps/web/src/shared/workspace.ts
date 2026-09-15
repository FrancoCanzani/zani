import { z } from "zod"

export const workspaceSlugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)

export function slugify(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)

  return slug.length >= 2 ? slug : "workspace"
}

export const inviteRoleSchema = z.enum(["member", "admin"])

export const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: workspaceSlugSchema,
  invites: z.array(z.email()).max(20).default([]),
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

export function canInvite(role: WorkspaceRole) {
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

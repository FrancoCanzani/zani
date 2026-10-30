import { z } from "zod"

export const inviteRoleSchema = z.enum(["member", "admin"])

export const createWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80),
})

const nullableTrimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value?.trim() || null)

export const updateWorkspaceBodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: nullableTrimmed(254)
    .refine(
      (value) => value === null || z.email().safeParse(value).success,
      "Invalid email"
    )
    .optional(),
  phone: nullableTrimmed(40).optional(),
  address: nullableTrimmed(500).optional(),
  taxId: nullableTrimmed(80).optional(),
  skipDetails: z.boolean().optional(),
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

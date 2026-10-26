export type WorkspaceRole = "owner" | "admin" | "member"

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

export function roleLabel(role: string) {
  const parsed = parseWorkspaceRole(role)
  if (!parsed) {
    return role
  }
  switch (parsed) {
    case "owner":
      return "Owner"
    case "admin":
      return "Admin"
    case "member":
      return "Member"
    default: {
      const exhaustive: never = parsed
      return exhaustive
    }
  }
}

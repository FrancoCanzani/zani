export function needsDisplayName(user: { name: string }) {
  return user.name.trim().length === 0
}

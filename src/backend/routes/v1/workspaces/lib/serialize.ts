type WorkspaceRow = {
  id: string
  name: string
  slug: string
  plan: string
  createdAt: number
}

export function serializeWorkspace(row: WorkspaceRow, role: string) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    role,
    createdAt: row.createdAt,
  }
}

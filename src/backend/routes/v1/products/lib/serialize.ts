export function serializeProduct(row: {
  id: string
  workspaceId: string
  name: string
  description: string | null
  unitAmountCents: number
  currency: string
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    description: row.description,
    unitAmountCents: row.unitAmountCents,
    currency: row.currency,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

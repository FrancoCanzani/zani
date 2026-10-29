export function serializeCustomer(row: {
  id: string
  workspaceId: string
  name: string
  phone: string | null
  email: string | null
  address: string | null
  taxId: string | null
  notes: string | null
  createdAt: number
  updatedAt: number
}) {
  return {
    id: row.id,
    workspaceId: row.workspaceId,
    name: row.name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    taxId: row.taxId,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

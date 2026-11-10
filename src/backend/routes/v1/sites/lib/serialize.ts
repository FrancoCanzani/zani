export type SiteRow = {
  id: string
  name: string
  domain: string | null
  createdAt: number
  revokedAt: number | null
}

export function serializeSite(row: SiteRow) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
  }
}

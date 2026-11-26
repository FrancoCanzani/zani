export const secretKeyPrefix = "zsk_"

export type SiteRow = {
  id: string
  name: string
  domain: string | null
  createdAt: number
  revokedAt: number | null
  secretKeyHash?: string | null
}

export function serializeSite(row: SiteRow) {
  return {
    id: row.id,
    name: row.name,
    domain: row.domain,
    createdAt: row.createdAt,
    revokedAt: row.revokedAt,
    hasSecretKey: Boolean(row.secretKeyHash),
  }
}

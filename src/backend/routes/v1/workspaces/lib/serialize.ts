type WorkspaceRow = {
  id: string
  name: string
  slug: string
  plan: string
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  defaultCurrency: string
  invoiceNumberPrefix: string
  defaultPaymentTerms: string | null
  defaultTaxName: string | null
  defaultTaxRateBps: number
  taxInclusive: boolean
  detailsSkippedAt: number | null
  createdAt: number
}

export function serializeWorkspace(row: WorkspaceRow, role: string) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    role,
    email: row.email,
    phone: row.phone,
    address: row.address,
    taxId: row.taxId,
    defaultCurrency: row.defaultCurrency,
    invoiceNumberPrefix: row.invoiceNumberPrefix,
    defaultPaymentTerms: row.defaultPaymentTerms,
    defaultTaxName: row.defaultTaxName,
    defaultTaxRateBps: row.defaultTaxRateBps,
    taxInclusive: row.taxInclusive,
    detailsSkippedAt: row.detailsSkippedAt,
    detailsComplete: Boolean(
      row.email?.trim() || row.phone?.trim() || row.address?.trim()
    ),
    createdAt: row.createdAt,
  }
}

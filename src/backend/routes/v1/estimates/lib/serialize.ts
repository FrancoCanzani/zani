import type { EstimateLineItem, EstimateStatus } from "../../../../db/schema"

import { depositCents, subtotalCents } from "./money"

export function serializeEstimate(row: {
  id: string
  workspaceId: string
  publicSlug: string
  status: EstimateStatus
  title: string
  customerId: string | null
  customerName: string
  customerPhone: string | null
  customerEmail: string | null
  currency: string
  lineItems: EstimateLineItem[]
  depositPercent: number
  notes: string | null
  createdByUserId: string | null
  sentAt: number | null
  viewedAt: number | null
  acceptedAt: number | null
  createdAt: number
  updatedAt: number
}) {
  const subtotal = subtotalCents(row.lineItems)
  const deposit = depositCents(subtotal, row.depositPercent)

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    publicSlug: row.publicSlug,
    status: row.status,
    title: row.title,
    customerId: row.customerId,
    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,
    currency: row.currency,
    lineItems: row.lineItems,
    depositPercent: row.depositPercent,
    notes: row.notes,
    subtotalCents: subtotal,
    depositCents: deposit,
    createdByUserId: row.createdByUserId,
    sentAt: row.sentAt,
    viewedAt: row.viewedAt,
    acceptedAt: row.acceptedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function serializeEstimateSummary(row: {
  id: string
  publicSlug: string
  status: EstimateStatus
  title: string
  customerName: string
  currency: string
  lineItems: EstimateLineItem[]
  depositPercent: number
  updatedAt: number
  createdAt: number
}) {
  const subtotal = subtotalCents(row.lineItems)
  return {
    id: row.id,
    publicSlug: row.publicSlug,
    status: row.status,
    title: row.title,
    customerName: row.customerName,
    currency: row.currency,
    depositPercent: row.depositPercent,
    subtotalCents: subtotal,
    depositCents: depositCents(subtotal, row.depositPercent),
    updatedAt: row.updatedAt,
    createdAt: row.createdAt,
  }
}

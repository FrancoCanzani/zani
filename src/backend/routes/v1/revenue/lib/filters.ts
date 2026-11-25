import { eq, type SQL } from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"

import { visitorIdentity } from "../../../../db/schema"
import {
  filterKeys,
  type Breakdown,
  type FilterKey,
} from "../../sites/lib/schema"

import type { RevenueQuery } from "./schema"

// Revenue can only be sliced by what the identity row captured at signup.
const identityColumns: Partial<Record<Breakdown | FilterKey, SQLiteColumn>> = {
  source: visitorIdentity.firstSource,
  referrer: visitorIdentity.firstReferrer,
  path: visitorIdentity.firstLanding,
  entry: visitorIdentity.firstLanding,
  country: visitorIdentity.country,
  device: visitorIdentity.device,
  utm_medium: visitorIdentity.firstMedium,
  utm_campaign: visitorIdentity.firstCampaign,
}

export function identityColumnFor(key: Breakdown | FilterKey) {
  return identityColumns[key] ?? null
}

export function identityFilters(query: RevenueQuery) {
  const conditions: SQL[] = []
  const ignored: FilterKey[] = []
  for (const key of filterKeys) {
    const value = query[key]
    if (value === undefined) continue
    const column = identityColumns[key]
    if (column) conditions.push(eq(column, value))
    else ignored.push(key)
  }
  return { conditions, ignored }
}

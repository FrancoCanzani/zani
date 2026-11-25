import { and, eq } from "drizzle-orm"

import { visitor } from "../../../../db/schema"
import { createDb } from "../../../../lib/db"
import { newId } from "../../../../lib/utils"

type Db = ReturnType<typeof createDb>

export type FirstTouch = {
  firstPath: string
  firstReferrerHost: string
  firstReferrerPath: string
  firstUtmSource: string
  firstUtmMedium: string
  firstUtmCampaign: string
  firstUtmContent: string
  firstUtmTerm: string
}

export async function upsertVisitor(
  db: Db,
  input: {
    siteId: string
    anonymousId: string
    now: number
    firstTouch: FirstTouch
    userId?: string
    email?: string
  }
) {
  const [existing] = await db
    .select()
    .from(visitor)
    .where(
      and(
        eq(visitor.siteId, input.siteId),
        eq(visitor.anonymousId, input.anonymousId)
      )
    )
    .limit(1)

  const userId = input.userId?.trim() ?? ""
  const email = input.email?.trim().toLowerCase() ?? ""
  const identifying = Boolean(userId || email)

  if (!existing) {
    await db.insert(visitor).values({
      id: newId(),
      siteId: input.siteId,
      anonymousId: input.anonymousId,
      userId,
      email,
      ...input.firstTouch,
      firstSeenAt: input.now,
      lastSeenAt: input.now,
      identifiedAt: identifying ? input.now : null,
    })
    return
  }

  const patch: {
    lastSeenAt: number
    userId?: string
    email?: string
    identifiedAt?: number
  } = {
    lastSeenAt: input.now,
  }
  if (userId) patch.userId = userId
  if (email) patch.email = email
  if (identifying && existing.identifiedAt === null) {
    patch.identifiedAt = input.now
  }

  await db.update(visitor).set(patch).where(eq(visitor.id, existing.id))
}

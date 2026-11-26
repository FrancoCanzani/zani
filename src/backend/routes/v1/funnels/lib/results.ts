import { and, eq, gte, lt, ne, sql, type SQL } from "drizzle-orm"

import { event } from "../../../../db/schema"
import type { Database } from "../../../../lib/db"
import { goalMatches } from "../../sites/lib/goals"
import {
  asNumber,
  filterConditions,
  sourceCondition,
  type StatsRange,
} from "../../sites/lib/stats"

import type { FunnelResultsQuery, FunnelStep } from "./schema"

function pathCondition(path: string) {
  if (!path.endsWith("*")) return eq(event.path, path)
  const prefix = path.slice(0, -1).replace(/[\\%_]/g, (char) => `\\${char}`)
  return sql`${event.path} like ${`${prefix}%`} escape '\\'`
}

function stepMatches(
  db: Database,
  input: {
    siteId: string
    range: StatsRange
    step: FunnelStep
    includeBots: boolean
    audience: SQL[]
  }
) {
  const { siteId, range, step } = input
  const eventScope = [
    eq(event.siteId, siteId),
    gte(event.timestamp, range.start),
    lt(event.timestamp, range.end),
    ...(input.includeBots ? [] : [ne(event.browser, "bot")]),
    ...input.audience,
  ]
  switch (step.type) {
    case "page":
      return db
        .select({ visitorId: event.visitorId, at: event.timestamp })
        .from(event)
        .where(
          and(
            ...eventScope,
            eq(event.name, "pageview"),
            pathCondition(step.path)
          )
        )
    case "event":
      return db
        .select({ visitorId: event.visitorId, at: event.timestamp })
        .from(event)
        .where(and(...eventScope, eq(event.name, step.name)))
    case "signup":
      return goalMatches(db, siteId, range, { kind: "signup" })
    case "paid":
      return goalMatches(db, siteId, range, { kind: "paid" })
    default: {
      const exhaustive: never = step
      return exhaustive
    }
  }
}

// Visitors must reach each step at or after the time they reached the previous one; other activity in between is allowed.
export async function funnelResults(
  db: Database,
  input: {
    siteId: string
    range: StatsRange
    steps: FunnelStep[]
    query: FunnelResultsQuery
  }
) {
  const { siteId, range, steps, query } = input
  if (steps.length === 0) return []

  const audience = [
    ...filterConditions({ ...query, event: undefined }),
    ...(query.source
      ? [await sourceCondition(db, siteId, range, query.source)]
      : []),
  ]

  const tables: SQL[] = steps.flatMap((step, index) => {
    const match = stepMatches(db, {
      siteId,
      range,
      step,
      includeBots: query.bots === "1",
      audience: index === 0 ? audience : [],
    }).getSQL()
    const matched = sql.raw(`m${index}`)
    const reached = sql.raw(`s${index}`)
    const previous = sql.raw(`s${index - 1}`)
    return [
      sql`${matched}(v, t) as (select * from (${match}))`,
      index === 0
        ? sql`${reached}(v, t) as (select v, min(t) from ${matched} group by v)`
        : sql`${reached}(v, t) as (select p.v, min(m.t) from ${previous} p join ${matched} m on m.v = p.v and m.t >= p.t group by p.v)`,
    ]
  })
  const counts = steps.map(
    (_, index) =>
      sql`(select count(*) from ${sql.raw(`s${index}`)}) as ${sql.raw(`c${index}`)}`
  )

  const row = await db.get<Record<string, unknown>>(
    sql`with ${sql.join(tables, sql`, `)} select ${sql.join(counts, sql`, `)}`
  )
  return steps.map((step, index) => ({
    step,
    visitors: asNumber(row?.[`c${index}`]),
  }))
}

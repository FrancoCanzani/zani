import type {
  mrrSnapshot,
  stripeCustomer,
  visitorIdentity,
} from "../../../../db/schema"
import { newId } from "../../../../lib/utils"

const dayMs = 24 * 60 * 60 * 1000
const monthMs = 30 * dayMs
const signupCount = 360
const historyDays = 210
const trialDays = 14

export const simUserPrefix = "sim_user_"
export const simCustomerPrefix = "cus_sim_"

type Channel = {
  weight: number
  conversion: number
  source: string
  medium: string
  campaign: string
  referrer: string
}

const channels: Channel[] = [
  { weight: 26, conversion: 0.12, source: "google", medium: "", campaign: "", referrer: "google.com" },
  { weight: 18, conversion: 0.1, source: "direct", medium: "", campaign: "", referrer: "" },
  { weight: 12, conversion: 0.05, source: "reddit", medium: "", campaign: "", referrer: "reddit.com" },
  { weight: 8, conversion: 0.09, source: "hacker news", medium: "", campaign: "", referrer: "news.ycombinator.com" },
  { weight: 8, conversion: 0.04, source: "product hunt", medium: "", campaign: "", referrer: "producthunt.com" },
  { weight: 10, conversion: 0.07, source: "twitter", medium: "social", campaign: "launch", referrer: "t.co" },
  { weight: 7, conversion: 0.2, source: "newsletter", medium: "email", campaign: "weekly", referrer: "" },
  { weight: 6, conversion: 0.15, source: "google", medium: "cpc", campaign: "brand", referrer: "google.com" },
  { weight: 5, conversion: 0.11, source: "chatgpt", medium: "", campaign: "", referrer: "chatgpt.com" },
]

const landings = [
  "/",
  "/",
  "/pricing",
  "/blog/stripe-mrr-explained",
  "/docs",
  "/compare/posthog",
]

const plans = [
  { mrr: 1900, weight: 45 },
  { mrr: 4900, weight: 35 },
  { mrr: 4083, weight: 10 },
  { mrr: 9900, weight: 10 },
]

const countries = ["US", "GB", "DE", "FR", "CA", "BR", "ES", "NL", "IN", "AU"]
const devices = ["desktop", "desktop", "desktop", "mobile"]
const firstNames = ["Ada", "Ben", "Chloe", "Dan", "Eva", "Finn", "Gia", "Hugo", "Iris", "Jon", "Kai", "Lena", "Max", "Nora", "Omar", "Pia", "Raj", "Sara", "Tom", "Uma"]
const lastNames = ["Park", "Silva", "Novak", "Reyes", "Okafor", "Berg", "Rossi", "Kim", "Dubois", "Shah"]

function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

function weighted<T extends { weight: number }>(items: T[], roll: number): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0)
  let cursor = roll * total
  for (const item of items) {
    cursor -= item.weight
    if (cursor <= 0) return item
  }
  return items.at(-1)!
}

function pick<T>(items: T[], roll: number): T {
  return items[Math.floor(roll * items.length) % items.length]!
}

export function buildRevenueSimulation(siteId: string, now = Date.now()) {
  const random = seeded(7)
  const identities: Array<typeof visitorIdentity.$inferInsert> = []
  const customers: Array<typeof stripeCustomer.$inferInsert> = []
  const snapshots: Array<typeof mrrSnapshot.$inferInsert> = []

  for (let index = 0; index < signupCount; index += 1) {
    // Skew signups toward recent months so growth is visible.
    const age = Math.pow(random(), 1.6) * historyDays * dayMs
    const signedUpAt = Math.round(now - age)
    const first = weighted(channels, random())
    const last = random() < 0.7 ? first : weighted(channels, random())
    const firstSeenAt = signedUpAt - Math.round(random() * 20 * dayMs)
    const firstName = pick(firstNames, random())
    const lastName = pick(lastNames, random())
    const email = `${firstName}.${lastName}${index}@example.com`.toLowerCase()
    const userRef = `${simUserPrefix}${index}`
    const identityId = newId()
    const identified = random() > 0.1

    identities.push({
      id: identityId,
      siteId,
      userRef,
      emailHash: null,
      signedUpAt,
      country: pick(countries, random()),
      device: pick(devices, random()),
      firstSource: first.source,
      firstMedium: first.medium,
      firstCampaign: first.campaign,
      firstReferrer: first.referrer,
      firstLanding: pick(landings, random()),
      firstSeenAt,
      lastSource: last.source,
      lastMedium: last.medium,
      lastCampaign: last.campaign,
      lastReferrer: last.referrer,
      lastLanding: pick(landings, random()),
      lastSeenAt: signedUpAt - Math.round(random() * dayMs),
    })

    const paidAt = signedUpAt + trialDays * dayMs + Math.round(random() * 7 * dayMs)
    if (random() > first.conversion * 1.6 || paidAt > now) continue

    const customerId = `${simCustomerPrefix}${index}`
    const subscriptionId = `sub_sim_${index}`
    customers.push({
      siteId,
      id: customerId,
      email,
      emailHash: null,
      name: `${firstName} ${lastName}`,
      userRef: identified ? userRef : null,
      identityId: identified ? identityId : null,
      currency: "usd",
      mrr: 0,
      createdAt: signedUpAt,
    })

    let mrr = weighted(plans, random()).mrr
    let cycle = 0
    for (let at = paidAt; at <= now; at += monthMs) {
      if (cycle > 0 && random() < 0.035) {
        snapshots.push({
          siteId,
          sourceId: `end:${subscriptionId}`,
          customerId,
          subscriptionId,
          at,
          mrr: 0,
          currency: "usd",
        })
        break
      }
      const change = random()
      if (cycle > 1 && change < 0.06) mrr = Math.min(9900, mrr * 2 + 100)
      else if (cycle > 1 && change < 0.08) mrr = Math.max(1900, Math.round(mrr / 2))
      snapshots.push({
        siteId,
        sourceId: `inv:in_sim_${index}_${cycle}`,
        customerId,
        subscriptionId,
        at,
        mrr,
        currency: "usd",
      })
      cycle += 1
    }
  }

  return { identities, customers, snapshots }
}

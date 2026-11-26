import type {
  event,
  eventProp,
  mrrSnapshot,
  stripeCustomer,
  stripePayment,
  visitor,
  visitorIdentity,
} from "../../../../db/schema"
import { sourceFor } from "../../../../lib/source"
import { newId } from "../../../../lib/utils"

const dayMs = 24 * 60 * 60 * 1000
const monthMs = 30 * dayMs
const historyDays = 180
const launchDay = 128
const trialDays = 14
const lifetimeDealPrice = 19900

export const simVisitorPrefix = "sim_vis_"
export const simUserPrefix = "sim_user_"
export const simCustomerPrefix = "cus_sim_"

const referrerPaths: Record<string, string[]> = {
  "google.com": ["/search", "/url"],
  "news.ycombinator.com": ["/item", "/news", "/show"],
  "producthunt.com": ["/posts/zani", "/"],
  "reddit.com": ["/r/SaaS/comments", "/r/indiehackers/comments"],
  "t.co": ["/k3x9", "/p2m1"],
  "github.com": ["/franco/zani", "/trending"],
}

const signupProps = [
  { plan: "free", place: "hero" },
  { plan: "free", place: "pricing" },
  { plan: "pro", place: "pricing" },
  { plan: "free", place: "docs" },
]

type Channel = {
  weight: number
  signupRate: number
  paidRate: number
  referrer: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
  landings: string[]
}

const blank = {
  utmSource: "",
  utmMedium: "",
  utmCampaign: "",
  utmContent: "",
  utmTerm: "",
}

const channels: Channel[] = [
  {
    weight: 30,
    signupRate: 0.035,
    paidRate: 0.22,
    referrer: "google.com",
    ...blank,
    landings: [
      "/blog/stripe-mrr-explained",
      "/blog/privacy-analytics",
      "/compare/plausible",
      "/docs",
      "/",
    ],
  },
  {
    weight: 20,
    signupRate: 0.05,
    paidRate: 0.25,
    referrer: "",
    ...blank,
    landings: ["/", "/", "/pricing", "/docs"],
  },
  {
    weight: 9,
    signupRate: 0.015,
    paidRate: 0.1,
    referrer: "reddit.com",
    ...blank,
    landings: ["/", "/blog/privacy-analytics"],
  },
  {
    weight: 5,
    signupRate: 0.025,
    paidRate: 0.18,
    referrer: "news.ycombinator.com",
    ...blank,
    landings: ["/", "/blog/stripe-mrr-explained"],
  },
  {
    weight: 3,
    signupRate: 0.02,
    paidRate: 0.08,
    referrer: "producthunt.com",
    ...blank,
    landings: ["/"],
  },
  {
    weight: 8,
    signupRate: 0.02,
    paidRate: 0.15,
    referrer: "t.co",
    ...blank,
    utmSource: "twitter",
    utmMedium: "social",
    utmCampaign: "launch",
    utmContent: "thread",
    landings: ["/", "/pricing"],
  },
  {
    weight: 5,
    signupRate: 0.07,
    paidRate: 0.3,
    referrer: "",
    ...blank,
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "weekly",
    utmContent: "header",
    landings: ["/blog/stripe-mrr-explained", "/changelog"],
  },
  {
    weight: 6,
    signupRate: 0.06,
    paidRate: 0.28,
    referrer: "google.com",
    ...blank,
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "brand",
    utmContent: "ad1",
    utmTerm: "revenue analytics",
    landings: ["/pricing", "/"],
  },
  {
    weight: 5,
    signupRate: 0.045,
    paidRate: 0.3,
    referrer: "chatgpt.com",
    ...blank,
    landings: ["/", "/compare/plausible", "/docs"],
  },
  {
    weight: 4,
    signupRate: 0.02,
    paidRate: 0.2,
    referrer: "github.com",
    ...blank,
    landings: ["/docs", "/docs/install"],
  },
  {
    weight: 3,
    signupRate: 0.01,
    paidRate: 0.1,
    referrer: "bing.com",
    ...blank,
    landings: ["/", "/blog/privacy-analytics"],
  },
  {
    weight: 2,
    signupRate: 0.03,
    paidRate: 0.15,
    referrer: "linkedin.com",
    ...blank,
    landings: ["/", "/about"],
  },
]

const launchChannels = [3, 4, 5]

const nextPages = [
  { path: "/pricing", weight: 30 },
  { path: "/docs", weight: 14 },
  { path: "/docs/install", weight: 8 },
  { path: "/", weight: 10 },
  { path: "/blog", weight: 8 },
  { path: "/changelog", weight: 6 },
  { path: "/about", weight: 5 },
  { path: "/compare/plausible", weight: 6 },
]

const countries = [
  {
    code: "US",
    weight: 34,
    cities: ["New York", "San Francisco", "Austin", "Seattle"],
  },
  { code: "GB", weight: 10, cities: ["London", "Manchester"] },
  { code: "DE", weight: 9, cities: ["Berlin", "Munich"] },
  { code: "IN", weight: 8, cities: ["Bengaluru", "Mumbai"] },
  { code: "FR", weight: 6, cities: ["Paris", "Lyon"] },
  { code: "CA", weight: 6, cities: ["Toronto", "Vancouver"] },
  { code: "BR", weight: 5, cities: ["São Paulo", "Rio de Janeiro"] },
  { code: "NL", weight: 4, cities: ["Amsterdam"] },
  { code: "ES", weight: 4, cities: ["Madrid", "Barcelona"] },
  { code: "AU", weight: 4, cities: ["Sydney", "Melbourne"] },
  { code: "JP", weight: 3, cities: ["Tokyo"] },
  { code: "AR", weight: 3, cities: ["Buenos Aires"] },
  { code: "SE", weight: 2, cities: ["Stockholm"] },
  { code: "PL", weight: 2, cities: ["Warsaw"] },
]

const devices = [
  {
    device: "desktop",
    weight: 64,
    browsers: ["chrome", "chrome", "chrome", "safari", "firefox", "edge"],
    systems: ["macos", "macos", "windows", "windows", "linux"],
    screens: ["1440x900", "1920x1080", "2560x1440", "1536x864"],
  },
  {
    device: "mobile",
    weight: 31,
    browsers: ["safari", "safari", "chrome", "chrome", "samsung"],
    systems: ["ios", "ios", "android", "android"],
    screens: ["390x844", "393x873", "412x915", "375x812"],
  },
  {
    device: "tablet",
    weight: 5,
    browsers: ["safari", "chrome"],
    systems: ["ios", "android"],
    screens: ["820x1180", "768x1024"],
  },
]

const plans = [
  { mrr: 1900, months: 1, weight: 45 },
  { mrr: 4900, months: 1, weight: 35 },
  { mrr: 4083, months: 12, weight: 10 },
  { mrr: 9900, months: 1, weight: 10 },
]

const firstNames = [
  "Ada",
  "Ben",
  "Chloe",
  "Dan",
  "Eva",
  "Finn",
  "Gia",
  "Hugo",
  "Iris",
  "Jon",
  "Kai",
  "Lena",
  "Max",
  "Nora",
  "Omar",
  "Pia",
  "Raj",
  "Sara",
  "Tom",
  "Uma",
]
const lastNames = [
  "Park",
  "Silva",
  "Novak",
  "Reyes",
  "Okafor",
  "Berg",
  "Rossi",
  "Kim",
  "Dubois",
  "Shah",
]

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

const launchBoost = [380, 240, 120, 60]

function launchVisitorsOn(day: number) {
  return launchBoost[day - launchDay] ?? 0
}

function visitorsOn(day: number, dayStartMs: number, random: () => number) {
  const growth = 14 + 90 * Math.pow(day / historyDays, 1.6)
  const weekday = new Date(dayStartMs).getUTCDay()
  const weekend = weekday === 0 || weekday === 6 ? 0.7 : 1
  return (
    Math.round(growth * weekend * (0.8 + random() * 0.4)) +
    launchVisitorsOn(day)
  )
}

export function buildSimulation(siteId: string, now = Date.now()) {
  const random = seeded(11)
  const events: Array<typeof event.$inferInsert> = []
  const props: Array<typeof eventProp.$inferInsert> = []
  const identities: Array<typeof visitorIdentity.$inferInsert> = []
  const visitors: Array<typeof visitor.$inferInsert> = []
  const customers: Array<typeof stripeCustomer.$inferInsert> = []
  const snapshots: Array<typeof mrrSnapshot.$inferInsert> = []
  const payments: Array<typeof stripePayment.$inferInsert> = []
  const dayStart = Math.floor(now / dayMs) * dayMs - historyDays * dayMs
  let visitorIndex = 0

  for (let day = 0; day <= historyDays; day += 1) {
    const count = visitorsOn(day, dayStart + day * dayMs, random)
    const launchVisitors = launchVisitorsOn(day)
    for (let n = 0; n < count; n += 1) {
      const index = visitorIndex++
      const channel =
        n < launchVisitors
          ? channels[pick(launchChannels, random())]!
          : weighted(channels, random())
      const country = weighted(countries, random())
      const device = weighted(devices, random())
      const bot = random() < 0.02
      const visitorId = `${simVisitorPrefix}${index.toString(36)}`
      const sessionId = `sim_ses_${index.toString(36)}`
      const visitStart =
        dayStart + day * dayMs + Math.round(random() * (dayMs - 10 * 60_000))
      if (visitStart > now - 60_000) continue
      let at = visitStart

      const landing = pick(channel.landings, random())
      const pages = [landing]
      const depth = random() < 0.42 ? 1 : 1 + Math.ceil(random() * 4)
      for (let page = 1; page < depth; page += 1) {
        pages.push(weighted(nextPages, random()).path)
      }

      const base = {
        siteId,
        visitorId,
        sessionId,
        referrerHost: channel.referrer,
        referrerPath: channel.referrer
          ? pick(referrerPaths[channel.referrer] ?? ["/"], random())
          : "",
        country: country.code,
        city: pick(country.cities, random()),
        browser: bot ? "bot" : pick(device.browsers, random()),
        device: device.device,
        os: pick(device.systems, random()),
        screen: pick(device.screens, random()),
        utmSource: channel.utmSource,
        utmMedium: channel.utmMedium,
        utmCampaign: channel.utmCampaign,
        utmContent: channel.utmContent,
        utmTerm: channel.utmTerm,
      }
      for (const path of pages) {
        events.push({
          ...base,
          id: newId(),
          timestamp: at,
          name: "pageview",
          path,
        })
        at += 20_000 + Math.round(random() * 100_000)
      }
      if (bot) continue

      const sawPricing = pages.includes("/pricing")
      if (random() > channel.signupRate * (sawPricing ? 2.4 : 0.8)) continue

      const signedUpAt = Math.min(at, now - 60_000)
      const signupId = newId()
      events.push({
        ...base,
        id: signupId,
        timestamp: signedUpAt,
        name: "signup",
        path: "/signup",
      })
      for (const [key, value] of Object.entries(pick(signupProps, random()))) {
        props.push({
          id: newId(),
          eventId: signupId,
          siteId,
          timestamp: signedUpAt,
          key,
          value,
        })
      }

      if (random() < 0.55) {
        events.push({
          ...base,
          id: newId(),
          timestamp: Math.min(signedUpAt + 4 * 60_000, now - 60_000),
          name: "project_created",
          path: "/app",
        })
      }

      const source = sourceFor(channel.utmSource, channel.referrer)
      const userRef = `${simUserPrefix}${index}`
      const identityId = newId()
      visitors.push({
        id: newId(),
        siteId,
        anonymousId: visitorId,
        userId: userRef,
        firstPath: landing,
        firstReferrerHost: channel.referrer,
        firstUtmSource: channel.utmSource,
        firstUtmMedium: channel.utmMedium,
        firstUtmCampaign: channel.utmCampaign,
        firstUtmContent: channel.utmContent,
        firstUtmTerm: channel.utmTerm,
        firstSeenAt: visitStart,
        lastSeenAt: signedUpAt,
        identifiedAt: signedUpAt,
      })
      const returned = random() < 0.25 ? channels[1]! : channel
      identities.push({
        id: identityId,
        siteId,
        userRef,
        emailHash: null,
        signedUpAt,
        country: country.code,
        device: device.device,
        firstSource: source,
        firstMedium: channel.utmMedium,
        firstCampaign: channel.utmCampaign,
        firstReferrer: channel.referrer,
        firstLanding: landing,
        firstSeenAt: visitStart,
        lastSource: sourceFor(returned.utmSource, returned.referrer),
        lastMedium: returned.utmMedium,
        lastCampaign: returned.utmCampaign,
        lastReferrer: returned.referrer,
        lastLanding: returned === channel ? landing : "/",
        lastSeenAt: signedUpAt,
      })

      const paidAt =
        signedUpAt + trialDays * dayMs + Math.round(random() * 5 * dayMs)
      const subscribes = paidAt <= now && random() <= channel.paidRate
      const buysOnce = !subscribes && random() < 0.05
      const trials = subscribes || (!buysOnce && random() < 0.35)
      if (!subscribes && !buysOnce && !trials) continue

      const firstName = pick(firstNames, random())
      const lastName = pick(lastNames, random())
      const identified = random() > 0.1
      const customerId = `${simCustomerPrefix}${index}`
      const subscriptionId = `sub_sim_${index}`
      customers.push({
        siteId,
        id: customerId,
        email: `${firstName}.${lastName}${index}@example.com`.toLowerCase(),
        emailHash: null,
        name: `${firstName} ${lastName}`,
        userRef: identified ? userRef : null,
        identityId: identified ? identityId : null,
        currency: "usd",
        mrr: 0,
        trialStartedAt: trials ? signedUpAt : null,
        createdAt: signedUpAt,
      })

      if (buysOnce) {
        payments.push({
          siteId,
          id: `ch_sim_${index}_once`,
          customerId,
          amount: lifetimeDealPrice,
          refunded: random() < 0.1 ? lifetimeDealPrice : 0,
          currency: "usd",
          at: Math.min(signedUpAt + 10 * 60_000, now - 60_000),
        })
        continue
      }
      if (!subscribes) continue

      events.push({
        ...base,
        id: newId(),
        sessionId: `sim_ses_${index.toString(36)}_pay`,
        timestamp: paidAt - 2 * 60_000,
        name: "checkout_started",
        path: "/billing",
      })

      const plan = weighted(plans, random())
      let mrr = plan.mrr
      let cycle = 0
      for (let paid = paidAt; paid <= now; paid += monthMs) {
        if (cycle > 0 && random() < 0.04) {
          snapshots.push({
            siteId,
            sourceId: `end:${subscriptionId}`,
            customerId,
            subscriptionId,
            at: paid,
            mrr: 0,
            currency: "usd",
          })
          break
        }
        const change = random()
        if (cycle > 1 && change < 0.06) mrr = Math.min(9900, mrr * 2 + 100)
        else if (cycle > 1 && change < 0.08)
          mrr = Math.max(1900, Math.round(mrr / 2))
        snapshots.push({
          siteId,
          sourceId: `inv:in_sim_${index}_${cycle}`,
          customerId,
          subscriptionId,
          at: paid,
          mrr,
          currency: "usd",
        })
        if (cycle % plan.months === 0) {
          const amount = mrr * plan.months
          payments.push({
            siteId,
            id: `ch_sim_${index}_${cycle}`,
            customerId,
            invoiceId: `in_sim_${index}_${cycle}`,
            amount,
            refunded: random() < 0.02 ? Math.round(amount / 2) : 0,
            currency: "usd",
            at: paid,
          })
        }
        cycle += 1
      }
    }
  }

  return {
    events,
    props,
    visitors,
    identities,
    customers,
    snapshots,
    payments,
  }
}

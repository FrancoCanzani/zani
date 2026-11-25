import { rateVital, type VitalMetric } from "../../collect/lib/vitals"
import { newId } from "../../../../lib/utils"

const dayMs = 24 * 60 * 60 * 1000
// D1 caps bound parameters per query (~100); each event row binds 20 columns.
const batchSize = 5
const eventCount = 240

const paths = ["/", "/pricing", "/docs", "/blog", "/about", "/changelog"]
const countries = ["US", "GB", "DE", "BR", "JP", "FR", "CA", ""]
const cities = [
  "San Francisco",
  "London",
  "Berlin",
  "Sao Paulo",
  "Tokyo",
  "Paris",
  "Toronto",
  "",
]
const browsers = ["chrome", "safari", "firefox", "edge", "other"]
const devices = ["desktop", "mobile", "tablet"]
const operatingSystems = ["macos", "windows", "ios", "android", "linux", "other"]
const screens = ["1440x900", "1920x1080", "390x844", "1366x768", "2560x1440"]
const referrers = [
  { host: "", path: "" },
  { host: "google.com", path: "/search" },
  { host: "google.com", path: "/url" },
  { host: "t.co", path: "/abc123" },
  { host: "github.com", path: "/franco/zani" },
  { host: "news.ycombinator.com", path: "/item" },
  { host: "bing.com", path: "/search" },
]
const utms = [
  {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  },
  {
    utmSource: "twitter",
    utmMedium: "social",
    utmCampaign: "launch",
    utmContent: "hero",
    utmTerm: "",
  },
  {
    utmSource: "newsletter",
    utmMedium: "email",
    utmCampaign: "weekly",
    utmContent: "header",
    utmTerm: "",
  },
  {
    utmSource: "google",
    utmMedium: "cpc",
    utmCampaign: "brand",
    utmContent: "ad1",
    utmTerm: "analytics",
  },
]
const customNames = ["signup", "click_cta", "purchase"] as const
const propSets: Record<(typeof customNames)[number], Array<Record<string, string>>> =
  {
    signup: [
      { plan: "free", source: "hero" },
      { plan: "pro", source: "pricing" },
      { plan: "free", source: "docs" },
    ],
    click_cta: [{ label: "start", place: "hero" }, { label: "demo", place: "nav" }],
    purchase: [
      { plan: "pro", amount: "20" },
      { plan: "pro", amount: "20" },
      { plan: "team", amount: "80" },
    ],
  }

function pick<T>(values: readonly T[], index: number): T {
  return values[index % values.length]!
}

function visitorToken(index: number) {
  return `sim_vis_${(index % 48).toString(16).padStart(8, "0")}_abcdef`
}

function sessionToken(visitor: number, day: number) {
  return `sim_ses_${visitor.toString(16).padStart(4, "0")}_${day.toString(16).padStart(4, "0")}_xx`
}

export function buildSimulateRows(siteId: string, end = Date.now()) {
  const start = end - 7 * dayMs
  const events = Array.from({ length: eventCount }, (_, index) => {
    const visitor = index % 48
    const day = Math.floor((index / eventCount) * 7)
    const utm = pick(utms, index)
    const referrer = pick(referrers, index + day)
    const name: string =
      index % 17 === 0 ? pick(customNames, index) : "pageview"
    return {
      id: newId(),
      siteId,
      timestamp:
        start + Math.floor(((index + 1) / (eventCount + 1)) * (end - start)),
      name,
      visitorId: visitorToken(visitor),
      sessionId: sessionToken(visitor, day),
      path: pick(paths, index + visitor),
      referrerHost: referrer.host,
      referrerPath: referrer.path,
      country: pick(countries, index),
      city: pick(cities, index),
      browser: index % 23 === 0 ? "bot" : pick(browsers, index + 1),
      device: pick(devices, index + 2),
      os: pick(operatingSystems, index + 3),
      screen: pick(screens, index + 4),
      utmSource: utm.utmSource,
      utmMedium: utm.utmMedium,
      utmCampaign: utm.utmCampaign,
      utmContent: utm.utmContent,
      utmTerm: utm.utmTerm,
    }
  })

  const props = events.flatMap((row, index) => {
    if (row.name === "pageview") return []
    const name = row.name as (typeof customNames)[number]
    const set = pick(propSets[name], index)
    return Object.entries(set).map(([key, value]) => ({
      id: newId(),
      eventId: row.id,
      siteId,
      timestamp: row.timestamp,
      key,
      value,
    }))
  })

  const vitals = events.flatMap((row, index) => {
    if (row.name !== "pageview" || row.browser === "bot") return []
    const samples: Array<{ metric: VitalMetric; value: number }> = [
      { metric: "load", value: 800 + (index % 40) * 90 },
      { metric: "lcp", value: 900 + (index % 35) * 110 },
      { metric: "inp", value: 40 + (index % 25) * 18 },
      { metric: "cls", value: Math.round(((index % 20) * 0.02) * 10000) / 10000 },
    ]
    return samples.map((sample) => ({
      id: newId(),
      siteId,
      timestamp: row.timestamp,
      metric: sample.metric,
      value: sample.value,
      rating: rateVital(sample.metric, sample.value),
      path: row.path,
      element: sample.metric === "lcp" ? "img.hero" : "",
      navType: index % 9 === 0 ? "reload" : "navigate",
      visitorId: row.visitorId,
      sessionId: row.sessionId,
      country: row.country,
      city: row.city,
      browser: row.browser,
      device: row.device,
      os: row.os,
    }))
  })

  return { events, props, vitals }
}

export { batchSize }

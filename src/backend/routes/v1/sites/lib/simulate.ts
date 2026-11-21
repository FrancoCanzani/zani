import { newId } from "../../../../lib/utils"

const dayMs = 24 * 60 * 60 * 1000
// D1 caps bound parameters per query (~100); each event row binds 19 columns.
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
  "",
  "google.com",
  "t.co",
  "github.com",
  "news.ycombinator.com",
  "bing.com",
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
const customNames = ["signup", "click_cta", "purchase"]

function pick<T>(values: T[], index: number): T {
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
  return Array.from({ length: eventCount }, (_, index) => {
    const visitor = index % 48
    const day = Math.floor((index / eventCount) * 7)
    const utm = pick(utms, index)
    return {
      id: newId(),
      siteId,
      timestamp:
        start + Math.floor(((index + 1) / (eventCount + 1)) * (end - start)),
      name: index % 17 === 0 ? pick(customNames, index) : "pageview",
      visitorId: visitorToken(visitor),
      sessionId: sessionToken(visitor, day),
      path: pick(paths, index + visitor),
      referrerHost: pick(referrers, index + day),
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
}

export { batchSize }

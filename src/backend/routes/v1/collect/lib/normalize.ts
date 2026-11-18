import type { CollectBody } from "./schema"

const namePattern = /^[a-z0-9_-]{1,32}$/
const sessionPattern = /^[A-Za-z0-9_-]{8,64}$/
const screenPattern = /^\d{2,5}x\d{2,5}$/
const cityPattern = /^[\p{L}\p{N} .'-]{1,80}$/u

export type NormalizedEvent = {
  name: string
  visitorId: string
  sessionId: string
  path: string
  referrerHost: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  utmContent: string
  utmTerm: string
  country: string
  city: string
  browser: string
  device: string
  os: string
  screen: string
}

export function normalizeEvent(
  body: CollectBody,
  input: {
    siteDomain: string
    userAgent: string
    country: string
    city: string
  }
): NormalizedEvent | null {
  const name = normalizeName(body.name)
  const visitorId = normalizeSessionId(body.visitorId)
  const sessionId = normalizeSessionId(body.sessionId)
  const path = normalizePath(body.path)
  if (!name || !visitorId || !sessionId || !path) return null

  const agent = classifyAgent(input.userAgent)
  return {
    name,
    visitorId,
    sessionId,
    path,
    referrerHost: referrerHost(body.referrer, input.siteDomain),
    utmSource: normalizeUtm(body.utmSource),
    utmMedium: normalizeUtm(body.utmMedium),
    utmCampaign: normalizeUtm(body.utmCampaign),
    utmContent: normalizeUtm(body.utmContent),
    utmTerm: normalizeUtm(body.utmTerm),
    country: normalizeCountry(input.country),
    city: normalizeCity(input.city),
    browser: agent.browser,
    device: agent.device,
    os: agent.os,
    screen: normalizeScreen(body.screen),
  }
}

export function normalizeName(input: string | undefined): string | null {
  const name = (input?.trim() || "pageview").toLowerCase()
  if (!namePattern.test(name)) return null
  return name
}

export function normalizeSessionId(input: string): string | null {
  const value = input.trim()
  if (!sessionPattern.test(value)) return null
  return value
}

function hashRoute(hash: string): string {
  if (!hash.startsWith("#/") && !hash.startsWith("#!/")) return ""
  const query = hash.indexOf("?")
  return query < 0 ? hash : hash.slice(0, query)
}

export function normalizePath(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 2048) return null

  let path = trimmed
  let route = ""
  if (path.includes("://")) {
    try {
      const url = new URL(path)
      path = url.pathname
      route = hashRoute(url.hash)
    } catch {
      return null
    }
  } else {
    const hash = path.indexOf("#")
    if (hash >= 0) {
      route = hashRoute(path.slice(hash))
      path = path.slice(0, hash)
    }
    const query = path.indexOf("?")
    if (query >= 0) path = path.slice(0, query)
  }

  if (!path.startsWith("/")) path = `/${path}`
  path += route
  if (path.length > 1024) return null
  return path
}

export function referrerHost(
  input: string | undefined,
  siteDomain: string | null
): string {
  if (!input?.trim()) return ""
  try {
    const host = new URL(input.trim()).hostname.toLowerCase().replace(/\.$/, "")
    if (!host) return ""
    if (siteDomain && host === siteDomain.toLowerCase()) return ""
    return host
  } catch {
    return ""
  }
}

export function normalizeUtm(input: string | undefined): string {
  if (!input) return ""
  const value = input.trim().slice(0, 80)
  for (const char of value) {
    if (char.charCodeAt(0) < 32) return ""
  }
  return value
}

export function normalizeCountry(input: string): string {
  if (!/^[A-Z]{2}$/.test(input)) return ""
  return input
}

export function normalizeCity(input: string): string {
  const value = input.trim().slice(0, 80)
  if (!value || !cityPattern.test(value)) return ""
  return value
}

export function normalizeScreen(input: string | undefined): string {
  if (!input) return ""
  const value = input.trim().toLowerCase()
  if (!screenPattern.test(value)) return ""
  return value
}

export function countryFromRequest(request: Request): string {
  const cf = request.cf
  if (!cf || typeof cf !== "object" || !("country" in cf)) return ""
  const country = cf.country
  if (typeof country !== "string") return ""
  return normalizeCountry(country)
}

export function cityFromRequest(request: Request): string {
  const cf = request.cf
  if (!cf || typeof cf !== "object" || !("city" in cf)) return ""
  const city = cf.city
  if (typeof city !== "string") return ""
  return normalizeCity(city)
}

export function classifyAgent(userAgent: string): {
  browser: string
  device: string
  os: string
} {
  const value = userAgent.toLowerCase()
  const device = /ipad|tablet/.test(value)
    ? "tablet"
    : /mobi|iphone|android/.test(value)
      ? "mobile"
      : "desktop"

  const browser = value.includes("edg/")
    ? "edge"
    : value.includes("opr/") || value.includes("opera")
      ? "opera"
      : value.includes("chrome/") || value.includes("crios/")
        ? "chrome"
        : value.includes("firefox/") || value.includes("fxios/")
          ? "firefox"
          : value.includes("safari/")
            ? "safari"
            : "other"

  const os = /iphone|ipad|ipod/.test(value)
    ? "ios"
    : value.includes("android")
      ? "android"
      : value.includes("windows")
        ? "windows"
        : value.includes("mac os") || value.includes("macos")
          ? "macos"
          : value.includes("linux") || value.includes("cros")
            ? "linux"
            : "other"

  return { browser, device, os }
}

import type { CollectBody } from "./schema"

const namePattern = /^[a-z0-9_-]{1,32}$/
const sessionPattern = /^[A-Za-z0-9_-]{8,64}$/

export type NormalizedEvent = {
  name: string
  sessionId: string
  path: string
  referrerHost: string
  utmSource: string
  utmMedium: string
  utmCampaign: string
  country: string
  browser: string
  device: string
}

export function normalizeEvent(
  body: CollectBody,
  input: { siteDomain: string | null; userAgent: string; country: string }
): NormalizedEvent | null {
  const name = normalizeName(body.name)
  const sessionId = normalizeSessionId(body.sessionId)
  const path = normalizePath(body.path)
  if (!name || !sessionId || !path) return null

  const agent = classifyAgent(input.userAgent)
  return {
    name,
    sessionId,
    path,
    referrerHost: referrerHost(body.referrer, input.siteDomain),
    utmSource: normalizeUtm(body.utmSource),
    utmMedium: normalizeUtm(body.utmMedium),
    utmCampaign: normalizeUtm(body.utmCampaign),
    country: normalizeCountry(input.country),
    browser: agent.browser,
    device: agent.device,
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

export function normalizePath(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed || trimmed.length > 2048) return null

  let path = trimmed
  if (path.includes("://")) {
    try {
      path = new URL(path).pathname
    } catch {
      return null
    }
  }

  const hash = path.indexOf("#")
  if (hash >= 0) path = path.slice(0, hash)
  const query = path.indexOf("?")
  if (query >= 0) path = path.slice(0, query)
  if (!path.startsWith("/")) path = `/${path}`
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

export function countryFromRequest(request: Request): string {
  const cf = request.cf
  if (!cf || typeof cf !== "object" || !("country" in cf)) return ""
  const country = cf.country
  if (typeof country !== "string") return ""
  return normalizeCountry(country)
}

export function classifyAgent(userAgent: string): {
  browser: string
  device: string
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

  return { browser, device }
}

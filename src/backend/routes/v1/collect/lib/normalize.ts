import type { CollectBody } from "./schema"

const namePattern = /^[a-z0-9_-]{1,32}$/
const screenPattern = /^\d{2,5}x\d{2,5}$/
const cityPattern = /^[\p{L}\p{N} .'-]{1,80}$/u
const propKeyPattern = /^[a-z0-9_]{1,64}$/
const maxPropKeys = 8
const maxPropValueLength = 255
const pageviewName = "pageview"

export type NormalizedEvent = {
  name: string
  path: string
  referrerHost: string
  referrerPath: string
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

export type NormalizedProp = {
  key: string
  value: string
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
  const path = normalizePath(body.path)
  if (!name || !path) return null

  const agent = classifyAgent(input.userAgent)
  const referrer = referrerParts(body.referrer, input.siteDomain)
  return {
    name,
    path,
    referrerHost: referrer.host,
    referrerPath: referrer.path,
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

export function normalizeProps(
  name: string,
  props: CollectBody["props"]
): NormalizedProp[] {
  if (name === pageviewName || props === undefined) return []

  const rows: NormalizedProp[] = []
  for (const [rawKey, rawValue] of Object.entries(props)) {
    if (rows.length >= maxPropKeys) break
    const key = normalizePropKey(rawKey)
    if (!key) continue
    const value = normalizePropValue(rawValue)
    if (value === null) continue
    rows.push({ key, value })
  }
  return rows
}

function normalizeName(input: string | undefined): string | null {
  const name = (input?.trim() || "pageview").toLowerCase()
  if (!namePattern.test(name)) return null
  return name
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

function referrerParts(
  input: string | undefined,
  siteDomain: string | null
): { host: string; path: string } {
  if (!input?.trim()) return { host: "", path: "" }
  try {
    const url = new URL(input.trim())
    const host = url.hostname.toLowerCase().replace(/\.$/, "")
    if (!host) return { host: "", path: "" }
    if (siteDomain && host === siteDomain.toLowerCase()) {
      return { host: "", path: "" }
    }
    let path = url.pathname || "/"
    if (!path.startsWith("/")) path = `/${path}`
    if (path.length > 1024) path = path.slice(0, 1024)
    return { host, path: path === "/" ? "/" : path }
  } catch {
    return { host: "", path: "" }
  }
}

function normalizeUtm(input: string | undefined): string {
  if (!input) return ""
  const value = input.trim().slice(0, 80)
  for (const char of value) {
    if (char.charCodeAt(0) < 32) return ""
  }
  return value
}

function normalizeCountry(input: string): string {
  if (!/^[A-Z]{2}$/.test(input)) return ""
  return input
}

function normalizeCity(input: string): string {
  const value = input.trim().slice(0, 80)
  if (!value || !cityPattern.test(value)) return ""
  return value
}

function normalizeScreen(input: string | undefined): string {
  if (!input) return ""
  const value = input.trim().toLowerCase()
  if (!screenPattern.test(value)) return ""
  return value
}

function normalizePropKey(input: string): string | null {
  const key = input.trim().toLowerCase()
  if (!propKeyPattern.test(key)) return null
  return key
}

function normalizePropValue(
  input: string | number | boolean | null
): string | null {
  if (input === null) return ""
  if (typeof input === "boolean") return input ? "true" : "false"
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null
    const value = String(input)
    if (value.length > maxPropValueLength) return null
    return value
  }
  const value = input.trim().slice(0, maxPropValueLength)
  for (const char of value) {
    if (char.charCodeAt(0) < 32) return null
  }
  return value
}

// First-party proxies forward the visitor's location; CORS keeps browsers from setting these headers directly.
const proxyCountryHeader = "x-zani-country"
const proxyCityHeader = "x-zani-city"

function decodedHeader(request: Request, name: string) {
  const value = request.headers.get(name)?.trim()
  if (!value) return ""
  try {
    return decodeURIComponent(value)
  } catch {
    return ""
  }
}

export function countryFromRequest(request: Request): string {
  const forwarded = decodedHeader(request, proxyCountryHeader)
  if (forwarded) return normalizeCountry(forwarded)
  const cf = request.cf
  if (!cf || typeof cf !== "object" || !("country" in cf)) return ""
  const country = cf.country
  if (typeof country !== "string") return ""
  return normalizeCountry(country)
}

export function cityFromRequest(request: Request): string {
  const forwarded = decodedHeader(request, proxyCityHeader)
  if (forwarded) return normalizeCity(forwarded)
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

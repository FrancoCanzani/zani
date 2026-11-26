import { sha256Hex } from "../../../../lib/utils"

const dayMs = 24 * 60 * 60 * 1000
const sessionMs = 30 * 60 * 1000

const proxyIpHeader = "x-zani-ip"

export function clientIp(request: Request): string {
  const proxied = request.headers.get(proxyIpHeader)?.trim()
  if (proxied) return proxied
  const cf = request.headers.get("cf-connecting-ip")?.trim()
  if (cf) return cf
  const real = request.headers.get("x-real-ip")?.trim()
  if (real) return real
  const forwarded = request.headers.get("x-forwarded-for")
  if (!forwarded) return ""
  return forwarded.split(",")[0]?.trim() ?? ""
}

export async function privacyIds(input: {
  secret: string
  siteId: string
  ip: string
  userAgent: string
  now: number
}): Promise<{ visitorId: string; sessionId: string }> {
  const day = Math.floor(input.now / dayMs)
  const sessionBucket = Math.floor(input.now / sessionMs)
  const base = `${input.secret}\0${input.siteId}\0${input.ip}\0${input.userAgent}`
  const [visitorId, sessionId] = await Promise.all([
    sha256Hex(`${base}\0d\0${day}`),
    sha256Hex(`${base}\0s\0${sessionBucket}`),
  ])
  return {
    visitorId: visitorId.slice(0, 32),
    sessionId: sessionId.slice(0, 32),
  }
}

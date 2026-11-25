import { z } from "zod"

import { sourceFor } from "../../../../lib/source"

const text = (max: number) => z.string().trim().max(max).optional()

export const touchSchema = z.object({
  utmSource: text(80),
  utmMedium: text(80),
  utmCampaign: text(80),
  referrer: text(2048),
  landing: text(2048),
  at: z.number().int().positive().optional(),
})

export const identifyBodySchema = z.object({
  userId: z.string().trim().min(1).max(128),
  email: z.string().trim().max(254).optional(),
  firstTouch: touchSchema.optional(),
  lastTouch: touchSchema.optional(),
})

export type TouchInput = z.infer<typeof touchSchema>

export type Touch = {
  source: string
  medium: string
  campaign: string
  referrer: string
  landing: string
  seenAt: number
}

function hostOf(url: string | undefined, siteDomain: string) {
  if (!url) return ""
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "")
    const own = siteDomain.toLowerCase().replace(/^www\./, "")
    if (host === own || host.endsWith(`.${own}`)) return ""
    return host
  } catch {
    return ""
  }
}

function landingPath(value: string | undefined) {
  if (!value) return ""
  const trimmed = value.trim()
  const path = trimmed.split(/[?#]/, 1)[0] ?? ""
  if (!path.startsWith("/")) return ""
  return path.slice(0, 512)
}

function clean(value: string | undefined) {
  if (!value) return ""
  for (const char of value) {
    if (char.charCodeAt(0) < 32) return ""
  }
  return value.trim().slice(0, 80)
}

export function normalizeTouch(
  input: TouchInput | undefined,
  siteDomain: string,
  now: number
): Touch | null {
  if (!input) return null
  const utmSource = clean(input.utmSource)
  const referrer = hostOf(input.referrer, siteDomain)
  const seenAt =
    input.at !== undefined && input.at <= now && input.at > now - 3650 * 864e5
      ? input.at
      : now
  return {
    source: sourceFor(utmSource, referrer),
    medium: clean(input.utmMedium).toLowerCase(),
    campaign: clean(input.utmCampaign),
    referrer,
    landing: landingPath(input.landing),
    seenAt,
  }
}

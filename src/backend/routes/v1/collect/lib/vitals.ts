import type { CollectBody } from "./schema"

export const vitalMetrics = ["load", "lcp", "inp", "cls"] as const
export const vitalRatings = ["good", "needs-improvement", "poor"] as const
export const navTypes = [
  "navigate",
  "reload",
  "back_forward",
  "prerender",
] as const

export type VitalMetric = (typeof vitalMetrics)[number]
export type VitalRating = (typeof vitalRatings)[number]
export type NavType = (typeof navTypes)[number]

export type NormalizedVital = {
  metric: VitalMetric
  value: number
  rating: VitalRating
  element: string
  navType: string
}

const thresholds: Record<
  VitalMetric,
  { good: number; needsImprovement: number }
> = {
  load: { good: 2500, needsImprovement: 4000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  inp: { good: 200, needsImprovement: 500 },
  cls: { good: 0.1, needsImprovement: 0.25 },
}

export function rateVital(metric: VitalMetric, value: number): VitalRating {
  const bound = thresholds[metric]
  if (value <= bound.good) return "good"
  if (value <= bound.needsImprovement) return "needs-improvement"
  return "poor"
}

export function normalizeVitals(
  input: CollectBody["vitals"]
): NormalizedVital[] {
  if (!input?.length) return []

  const seen = new Set<VitalMetric>()
  const rows: NormalizedVital[] = []
  for (const sample of input) {
    if (rows.length >= 8) break
    if (!isVitalMetric(sample.metric)) continue
    if (seen.has(sample.metric)) continue
    if (!Number.isFinite(sample.value) || sample.value < 0) continue
    if (sample.metric === "cls" && sample.value > 10) continue
    if (sample.metric !== "cls" && sample.value > 60_000) continue

    seen.add(sample.metric)
    rows.push({
      metric: sample.metric,
      value: sample.metric === "cls" ? roundCls(sample.value) : Math.round(sample.value),
      rating: rateVital(
        sample.metric,
        sample.metric === "cls" ? sample.value : Math.round(sample.value)
      ),
      element: normalizeElement(sample.element),
      navType: normalizeNavType(sample.navType),
    })
  }
  return rows
}

function isVitalMetric(value: string): value is VitalMetric {
  return (vitalMetrics as readonly string[]).includes(value)
}

function roundCls(value: number) {
  return Math.round(value * 10000) / 10000
}

function normalizeElement(input: string | undefined) {
  if (!input) return ""
  const value = input.trim().slice(0, 200)
  for (const char of value) {
    if (char.charCodeAt(0) < 32) return ""
  }
  return value
}

function normalizeNavType(input: string | undefined) {
  if (!input) return ""
  return (navTypes as readonly string[]).includes(input) ? input : ""
}

export { thresholds }

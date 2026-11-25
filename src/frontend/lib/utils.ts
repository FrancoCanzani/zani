export { cn } from "cn"

export function fieldErrors(
  errors: unknown[]
): Array<{ message?: string } | undefined> {
  return errors.map((error) => {
    if (typeof error === "string") {
      return { message: error }
    }
    if (
      error &&
      typeof error === "object" &&
      "message" in error &&
      typeof error.message === "string"
    ) {
      return { message: error.message }
    }
    return { message: "Invalid value" }
  })
}

const relativeUnits: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
]

export function formatRelative(ms: number, now = Date.now()) {
  const diff = ms - now
  const format = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" })
  for (const [unit, size] of relativeUnits) {
    if (Math.abs(diff) >= size)
      return format.format(Math.round(diff / size), unit)
  }
  return "just now"
}

export function formatDateTime(ms: number | null) {
  if (ms === null) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms)
}

export function formatCount(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

import { describe, expect, test } from "bun:test"

import { parseRange } from "./stats"

const start = "2026-11-01T00:00:00.000Z"

describe("parseRange", () => {
  test("accepts a range inside 31 days", () => {
    const parsed = parseRange({
      start,
      end: "2026-11-08T00:00:00.000Z",
      grain: "hour",
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.range.grain).toBe("hour")
    expect(parsed.range.end - parsed.range.start).toBe(7 * 24 * 60 * 60 * 1000)
  })

  test("rejects a range longer than 31 days", () => {
    const parsed = parseRange({
      start,
      end: "2026-12-15T00:00:00.000Z",
    })
    expect(parsed).toEqual({
      ok: false,
      message: "The range can be at most 31 days.",
    })
  })

  test("rejects an end that is not after the start", () => {
    const parsed = parseRange({ start, end: start })
    expect(parsed.ok).toBe(false)
  })

  test("defaults the grain to day", () => {
    const parsed = parseRange({
      start,
      end: "2026-11-02T00:00:00.000Z",
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.range.grain).toBe("day")
  })
})

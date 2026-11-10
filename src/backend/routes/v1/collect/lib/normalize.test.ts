import { describe, expect, test } from "bun:test"

import {
  classifyAgent,
  normalizeEvent,
  normalizeName,
  normalizePath,
  normalizeUtm,
  referrerHost,
} from "./normalize"
import type { CollectBody } from "./schema"

const body: CollectBody = {
  sessionId: "session-1",
  path: "/pricing?plan=pro#buy",
  referrer: "https://www.google.com/search?q=zani",
  utmSource: "newsletter",
}

describe("normalizeEvent", () => {
  test("keeps a pageview path and an external referrer host", () => {
    const event = normalizeEvent(body, {
      siteDomain: "example.com",
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      country: "US",
    })

    expect(event).toEqual({
      name: "pageview",
      sessionId: "session-1",
      path: "/pricing",
      referrerHost: "www.google.com",
      utmSource: "newsletter",
      utmMedium: "",
      utmCampaign: "",
      country: "US",
      browser: "safari",
      device: "mobile",
    })
  })

  test("drops a referrer on the site's own domain", () => {
    expect(referrerHost("https://example.com/docs", "example.com")).toBe("")
  })

  test("strips the query string from a full url", () => {
    expect(normalizePath("https://example.com/docs/start?x=1")).toBe(
      "/docs/start"
    )
  })

  test("rejects an event name outside the allowed characters", () => {
    expect(normalizeName("Sign Up")).toBeNull()
  })

  test("drops a campaign value that contains a control character", () => {
    expect(normalizeUtm("spring\nsale")).toBe("")
  })

  test("classifies chrome before safari", () => {
    expect(
      classifyAgent(
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      )
    ).toEqual({ browser: "chrome", device: "desktop" })
  })
})

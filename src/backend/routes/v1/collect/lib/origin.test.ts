import { describe, expect, test } from "bun:test"

import { originAllowed, originHost } from "./origin"

describe("origin", () => {
  test("reads the hostname from an origin", () => {
    expect(originHost("https://Example.com")).toBe("example.com")
    expect(originHost("http://localhost:5173")).toBe("localhost")
  })

  test("allows only the site domain", () => {
    expect(originAllowed("example.com", "example.com")).toBe(true)
    expect(originAllowed("www.example.com", "example.com")).toBe(false)
    expect(originAllowed(null, "example.com")).toBe(false)
  })
})

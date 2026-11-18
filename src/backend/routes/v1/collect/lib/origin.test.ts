import { describe, expect, test } from "bun:test"

import { hostsMatch, originAllowed, originHost, stripWww } from "./origin"

describe("origin", () => {
  test("reads the hostname from an origin", () => {
    expect(originHost("https://Example.com")).toBe("example.com")
    expect(originHost("http://localhost:5173")).toBe("localhost")
  })

  test("strips a single leading www", () => {
    expect(stripWww("www.example.com")).toBe("example.com")
    expect(stripWww("WWW.Example.com.")).toBe("example.com")
    expect(stripWww("example.com")).toBe("example.com")
    expect(stripWww("app.example.com")).toBe("app.example.com")
  })

  test("treats www and apex as the same host", () => {
    expect(hostsMatch("www.example.com", "example.com")).toBe(true)
    expect(hostsMatch("example.com", "www.example.com")).toBe(true)
    expect(hostsMatch("www.example.com", "www.example.com")).toBe(true)
    expect(hostsMatch("app.example.com", "example.com")).toBe(false)
    expect(hostsMatch("example.com", "other.com")).toBe(false)
  })

  test("allows the site domain and its www twin", () => {
    expect(originAllowed("example.com", "example.com")).toBe(true)
    expect(originAllowed("www.example.com", "example.com")).toBe(true)
    expect(originAllowed("example.com", "www.example.com")).toBe(true)
    expect(originAllowed("app.example.com", "example.com")).toBe(false)
    expect(originAllowed(null, "example.com")).toBe(false)
  })
})

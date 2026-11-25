const source = `(() => {
  const el = document.currentScript
  if (!(el instanceof HTMLScriptElement)) return
  const key = el.getAttribute("data-key")
  if (!key) return
  const endpoint = new URL("/api/v1/collect", el.src)
  const namePattern = /^[a-z0-9_-]{1,32}$/
  const propKeyPattern = /^[a-z0-9_]{1,64}$/
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  const maxPropKeys = 8
  const maxPropValueLength = 255
  const aidKey = "zani_aid"
  const ftKey = "zani_ft"
  let path = ""
  let utms = {
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    utmContent: "",
    utmTerm: "",
  }
  const readUtm = (name) => {
    const value = new URLSearchParams(location.search).get(name)
    if (!value) return ""
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 80) return ""
    return trimmed
  }
  const captureUtms = () => {
    const next = {
      utmSource: readUtm("utm_source"),
      utmMedium: readUtm("utm_medium"),
      utmCampaign: readUtm("utm_campaign"),
      utmContent: readUtm("utm_content"),
      utmTerm: readUtm("utm_term"),
    }
    if (Object.values(next).some(Boolean)) utms = next
  }
  const pagePath = () => {
    const hash = location.hash
    if (hash.startsWith("#/") || hash.startsWith("#!/")) {
      const query = hash.indexOf("?")
      return location.pathname + (query < 0 ? hash : hash.slice(0, query))
    }
    return location.pathname
  }
  const screenSize = () => {
    const width = window.screen?.width
    const height = window.screen?.height
    if (!width || !height) return
    return Math.round(width) + "x" + Math.round(height)
  }
  const newId = () => {
    try {
      if (crypto.randomUUID) return crypto.randomUUID()
    } catch (_) {}
    const bytes = new Uint8Array(16)
    try {
      crypto.getRandomValues(bytes)
    } catch (_) {
      for (let i = 0; i < bytes.length; i += 1) bytes[i] = (Math.random() * 256) | 0
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
    return (
      hex.slice(0, 8) +
      "-" +
      hex.slice(8, 12) +
      "-" +
      hex.slice(12, 16) +
      "-" +
      hex.slice(16, 20) +
      "-" +
      hex.slice(20)
    )
  }
  const anonymousId = (() => {
    try {
      const existing = localStorage.getItem(aidKey)
      if (existing && uuidPattern.test(existing)) return existing
      const id = newId()
      localStorage.setItem(aidKey, id)
      return id
    } catch (_) {
      return undefined
    }
  })()
  const readFirstTouch = () => {
    try {
      const raw = localStorage.getItem(ftKey)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== "object") return
      return parsed
    } catch (_) {}
  }
  const writeFirstTouch = (value) => {
    try {
      localStorage.setItem(ftKey, JSON.stringify(value))
    } catch (_) {}
  }
  const firstTouch = (() => {
    const existing = readFirstTouch()
    if (existing && typeof existing.path === "string") return existing
    captureUtms()
    const value = {
      path: pagePath(),
      referrer: document.referrer || "",
      utmSource: utms.utmSource,
      utmMedium: utms.utmMedium,
      utmCampaign: utms.utmCampaign,
      utmContent: utms.utmContent,
      utmTerm: utms.utmTerm,
    }
    writeFirstTouch(value)
    return value
  })()
  const normalizeProps = (input) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) return
    const props = {}
    let count = 0
    for (const [rawKey, rawValue] of Object.entries(input)) {
      if (count >= maxPropKeys) break
      const keyName = String(rawKey).trim().toLowerCase()
      if (!propKeyPattern.test(keyName)) continue
      if (rawValue === null) {
        props[keyName] = null
        count += 1
        continue
      }
      const type = typeof rawValue
      if (type === "boolean") {
        props[keyName] = rawValue
        count += 1
        continue
      }
      if (type === "number") {
        if (!Number.isFinite(rawValue)) continue
        props[keyName] = rawValue
        count += 1
        continue
      }
      if (type !== "string") continue
      const value = rawValue.trim().slice(0, maxPropValueLength)
      let ok = true
      for (let i = 0; i < value.length; i += 1) {
        if (value.charCodeAt(i) < 32) {
          ok = false
          break
        }
      }
      if (!ok) continue
      props[keyName] = value
      count += 1
    }
    return count > 0 ? props : undefined
  }
  const post = (body) => {
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-write-key": key },
      body: JSON.stringify(body),
      keepalive: true,
    })
  }
  const send = (name, referrer, props, identity) => {
    captureUtms()
    const body = {
      name,
      path: path || pagePath(),
      referrer,
      screen: screenSize(),
      utmSource: utms.utmSource || undefined,
      utmMedium: utms.utmMedium || undefined,
      utmCampaign: utms.utmCampaign || undefined,
      utmContent: utms.utmContent || undefined,
      utmTerm: utms.utmTerm || undefined,
      firstPath: firstTouch.path || undefined,
      firstReferrer: firstTouch.referrer || undefined,
      firstUtmSource: firstTouch.utmSource || undefined,
      firstUtmMedium: firstTouch.utmMedium || undefined,
      firstUtmCampaign: firstTouch.utmCampaign || undefined,
      firstUtmContent: firstTouch.utmContent || undefined,
      firstUtmTerm: firstTouch.utmTerm || undefined,
    }
    if (anonymousId) body.anonymousId = anonymousId
    if (identity?.userId) body.userId = identity.userId
    if (identity?.email) body.email = identity.email
    if (props) body.props = props
    post(body)
  }
  const trackPage = () => {
    const next = pagePath()
    if (next === path) return
    const referrer = path ? location.origin + path : document.referrer
    path = next
    send("pageview", referrer)
  }
  const track = (name, props) => {
    if (typeof name !== "string") return
    const trimmed = name.trim().toLowerCase()
    if (!namePattern.test(trimmed) || trimmed === "pageview" || trimmed === "identify")
      return
    if (!path) path = pagePath()
    send(trimmed, document.referrer, normalizeProps(props))
  }
  const identify = (userId, traits) => {
    let id = ""
    let email = ""
    let props
    if (typeof userId === "string") {
      id = userId.trim().slice(0, 128)
      if (traits && typeof traits === "object" && !Array.isArray(traits)) {
        if (typeof traits.email === "string") {
          email = traits.email.trim().slice(0, 254)
        }
        const { email: _email, ...rest } = traits
        props = normalizeProps(rest)
      }
    } else if (userId && typeof userId === "object" && !Array.isArray(userId)) {
      if (typeof userId.userId === "string") id = userId.userId.trim().slice(0, 128)
      if (typeof userId.id === "string" && !id) id = userId.id.trim().slice(0, 128)
      if (typeof userId.email === "string") email = userId.email.trim().slice(0, 254)
      const { userId: _userId, id: _id, email: _email, ...rest } = userId
      props = normalizeProps(rest)
    }
    if (!id && !email) return
    if (!path) path = pagePath()
    send("identify", document.referrer, props, {
      userId: id || undefined,
      email: email || undefined,
    })
  }
  const push = history.pushState
  const replace = history.replaceState
  history.pushState = function () {
    const result = push.apply(this, arguments)
    trackPage()
    return result
  }
  history.replaceState = function () {
    const result = replace.apply(this, arguments)
    trackPage()
    return result
  }
  addEventListener("popstate", trackPage)
  addEventListener("hashchange", trackPage)
  trackPage()
  window.zani = { track, identify }
})()
`

export function scriptResponse() {
  return new Response(source, {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  })
}

const source = `(() => {
  const el = document.currentScript
  if (!(el instanceof HTMLScriptElement)) return
  const key = el.getAttribute("data-key")
  if (!key) return
  const endpoint = new URL("/api/v1/collect", el.src)
  const namePattern = /^[a-z0-9_-]{1,32}$/
  const propKeyPattern = /^[a-z0-9_]{1,64}$/
  const maxPropKeys = 8
  const maxPropValueLength = 255
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
  const send = (name, referrer, props) => {
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
    }
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
    if (!namePattern.test(trimmed) || trimmed === "pageview") return
    if (!path) path = pagePath()
    send(trimmed, document.referrer, normalizeProps(props))
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
  window.zani = { track }

  const cssPath = (node) => {
    if (!node || !node.tagName) return ""
    let value = String(node.tagName).toLowerCase()
    if (node.id) return (value + "#" + node.id).slice(0, 200)
    if (node.classList && node.classList.length) {
      value +=
        "." +
        Array.from(node.classList)
          .slice(0, 2)
          .join(".")
    }
    return value.slice(0, 200)
  }
  const navType = () => {
    try {
      const entry = performance.getEntriesByType("navigation")[0]
      if (!entry || !entry.type) return
      if (
        entry.type === "navigate" ||
        entry.type === "reload" ||
        entry.type === "back_forward" ||
        entry.type === "prerender"
      ) {
        return entry.type
      }
    } catch (_) {}
  }
  const pageLoadMs = () => {
    try {
      const entry = performance.getEntriesByType("navigation")[0]
      if (!entry) return
      const value =
        entry.loadEventEnd > 0
          ? entry.loadEventEnd
          : entry.duration > 0
            ? entry.duration
            : 0
      if (!value || value < 0) return
      return Math.round(value)
    } catch (_) {}
  }

  let lcpValue = null
  let lcpElement = ""
  let clsValue = 0
  let inpValue = null
  let flushed = false
  const navigation = navType()

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (!last) return
      lcpValue = last.startTime
      lcpElement = cssPath(last.element)
    })
    lcpObserver.observe({ type: "largest-contentful-paint", buffered: true })
  } catch (_) {}

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue
        clsValue += entry.value
      }
    })
    clsObserver.observe({ type: "layout-shift", buffered: true })
  } catch (_) {}

  try {
    const eventObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId === 0) continue
        const duration = entry.duration
        if (!Number.isFinite(duration)) continue
        if (inpValue === null || duration > inpValue) inpValue = duration
      }
    })
    eventObserver.observe({ type: "event", buffered: true, durationThreshold: 16 })
  } catch (_) {}

  const flushVitals = () => {
    if (flushed) return
    const samples = []
    const load = pageLoadMs()
    if (load !== undefined) samples.push({ metric: "load", value: load, navType: navigation })
    if (lcpValue !== null) {
      samples.push({
        metric: "lcp",
        value: Math.round(lcpValue),
        element: lcpElement || undefined,
        navType: navigation,
      })
    }
    if (inpValue !== null) {
      samples.push({
        metric: "inp",
        value: Math.round(inpValue),
        navType: navigation,
      })
    }
    if (clsValue > 0) {
      samples.push({
        metric: "cls",
        value: Math.round(clsValue * 10000) / 10000,
        navType: navigation,
      })
    }
    if (!samples.length) return
    flushed = true
    post({
      path: path || pagePath(),
      vitals: samples,
    })
  }

  addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushVitals()
  })
  addEventListener("pagehide", flushVitals)
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

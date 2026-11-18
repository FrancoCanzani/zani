const source = `(() => {
  const el = document.currentScript
  if (!(el instanceof HTMLScriptElement)) return
  const key = el.getAttribute("data-key")
  if (!key) return
  const visitorKey = "zani_visitor"
  const sessionKey = "zani_session"
  const utmKey = "zani_utm"
  let visitor = localStorage.getItem(visitorKey)
  if (!visitor) {
    visitor = crypto.randomUUID()
    localStorage.setItem(visitorKey, visitor)
  }
  let session = sessionStorage.getItem(sessionKey)
  if (!session) {
    session = crypto.randomUUID()
    sessionStorage.setItem(sessionKey, session)
  }
  const endpoint = new URL("/api/v1/collect", el.src)
  let path = ""
  const readUtm = (name) => {
    const value = new URLSearchParams(location.search).get(name)
    if (!value) return ""
    const trimmed = value.trim()
    if (!trimmed || trimmed.length > 80) return ""
    return trimmed
  }
  const sessionUtms = () => {
    const existing = sessionStorage.getItem(utmKey)
    if (existing) {
      try {
        const parsed = JSON.parse(existing)
        if (parsed && typeof parsed === "object") return parsed
      } catch {}
    }
    const next = {
      utmSource: readUtm("utm_source"),
      utmMedium: readUtm("utm_medium"),
      utmCampaign: readUtm("utm_campaign"),
      utmContent: readUtm("utm_content"),
      utmTerm: readUtm("utm_term"),
    }
    sessionStorage.setItem(utmKey, JSON.stringify(next))
    return next
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
  const send = (referrer) => {
    const utms = sessionUtms()
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-write-key": key },
      body: JSON.stringify({
        name: "pageview",
        visitorId: visitor,
        sessionId: session,
        path,
        referrer,
        screen: screenSize(),
        utmSource: utms.utmSource || undefined,
        utmMedium: utms.utmMedium || undefined,
        utmCampaign: utms.utmCampaign || undefined,
        utmContent: utms.utmContent || undefined,
        utmTerm: utms.utmTerm || undefined,
      }),
      keepalive: true,
    })
  }
  const track = () => {
    const next = pagePath()
    if (next === path) return
    const referrer = path ? location.origin + path : document.referrer
    path = next
    send(referrer)
  }
  const push = history.pushState
  const replace = history.replaceState
  history.pushState = function () {
    const result = push.apply(this, arguments)
    track()
    return result
  }
  history.replaceState = function () {
    const result = replace.apply(this, arguments)
    track()
    return result
  }
  addEventListener("popstate", track)
  addEventListener("hashchange", track)
  track()
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

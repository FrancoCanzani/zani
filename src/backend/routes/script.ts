const source = `(() => {
  const el = document.currentScript
  if (!(el instanceof HTMLScriptElement)) return
  const key = el.getAttribute("data-key")
  if (!key) return
  const endpoint = new URL("/api/v1/collect", el.src)
  const namePattern = /^[a-z0-9_-]{1,32}$/
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
  const send = (name, referrer) => {
    captureUtms()
    void fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", "x-write-key": key },
      body: JSON.stringify({
        name,
        path: path || pagePath(),
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
  const trackPage = () => {
    const next = pagePath()
    if (next === path) return
    const referrer = path ? location.origin + path : document.referrer
    path = next
    send("pageview", referrer)
  }
  const track = (name) => {
    if (typeof name !== "string") return
    const trimmed = name.trim().toLowerCase()
    if (!namePattern.test(trimmed) || trimmed === "pageview") return
    if (!path) path = pagePath()
    send(trimmed, document.referrer)
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

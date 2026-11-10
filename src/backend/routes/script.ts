const source = `(() => {
  const el = document.currentScript
  if (!(el instanceof HTMLScriptElement)) return
  const key = el.getAttribute("data-key")
  if (!key) return
  const visitorKey = "zani_visitor"
  const sessionKey = "zani_session"
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
  const url = new URL("/api/v1/collect", el.src)
  void fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", "x-write-key": key },
    body: JSON.stringify({
      name: "pageview",
      visitorId: visitor,
      sessionId: session,
      path: location.pathname,
      referrer: document.referrer,
    }),
    keepalive: true,
  })
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

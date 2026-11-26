import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { CopyButton } from "@components/install-snippet"
import { Segmented } from "@components/segmented"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"

import { replaceSecretKey, type Site } from "./api"

const proxies = ["nextjs", "cloudflare"] as const
type ProxyKind = (typeof proxies)[number]
const proxyLabels: Record<ProxyKind, string> = {
  nextjs: "Next.js",
  cloudflare: "Cloudflare",
}

function origin() {
  return typeof window === "undefined" ? "https://example.com" : window.location.origin
}

function nextProxySource(upstream: string) {
  return [
    "// app/z/[...path]/route.ts",
    'import type { NextRequest } from "next/server"',
    "",
    `const upstream = "${upstream}"`,
    "",
    "async function proxy(req: NextRequest, path: string[]) {",
    "  const target = new URL(path.join(\"/\"), upstream.endsWith(\"/\") ? upstream : `${upstream}/`)",
    "  target.search = new URL(req.url).search",
    "  const headers = new Headers(req.headers)",
    '  headers.delete("cookie")',
    '  headers.delete("host")',
    '  headers.delete("content-encoding")',
    '  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? ""',
    '  if (ip) headers.set("x-zani-ip", ip)',
    '  const country = req.headers.get("x-vercel-ip-country")',
    '  if (country) headers.set("x-zani-country", country)',
    '  const city = req.headers.get("x-vercel-ip-city")',
    '  if (city) headers.set("x-zani-city", decodeURIComponent(city))',
    "  const res = await fetch(target, {",
    "    method: req.method,",
    "    headers,",
    "    body: req.body,",
    "    duplex: \"half\",",
    "  } as RequestInit)",
    "  return new Response(res.body, { status: res.status, headers: res.headers })",
    "}",
    "",
    "export async function GET(",
    "  req: NextRequest,",
    "  ctx: { params: Promise<{ path: string[] }> }",
    ") {",
    "  const { path } = await ctx.params",
    "  return proxy(req, path)",
    "}",
    "",
    "export async function POST(",
    "  req: NextRequest,",
    "  ctx: { params: Promise<{ path: string[] }> }",
    ") {",
    "  const { path } = await ctx.params",
    "  return proxy(req, path)",
    "}",
  ].join("\n")
}

function cloudflareProxySource(upstream: string) {
  return [
    "export default {",
    "  async fetch(request) {",
    `    const upstream = "${upstream}"`,
    '    const url = new URL(request.url)',
    '    const prefix = "/z/"',
    "    if (!url.pathname.startsWith(prefix)) return fetch(request)",
    "    const target = new URL(url.pathname.slice(prefix.length), upstream.endsWith(\"/\") ? upstream : `${upstream}/`)",
    "    target.search = url.search",
    "    const headers = new Headers(request.headers)",
    '    headers.delete("cookie")',
    '    headers.delete("host")',
    '    headers.delete("content-encoding")',
    '    const ip = request.headers.get("cf-connecting-ip")',
    '    if (ip) headers.set("x-zani-ip", ip)',
    "    const country = request.cf?.country",
    '    if (typeof country === "string") headers.set("x-zani-country", country)',
    "    const city = request.cf?.city",
    '    if (typeof city === "string") headers.set("x-zani-city", city)',
    "    return fetch(target, { method: request.method, headers, body: request.body })",
    "  },",
    "}",
  ].join("\n")
}

function proxyScript(writeKey: string | null) {
  const key = writeKey ?? "YOUR_WRITE_KEY"
  return [
    "<script",
    "  defer",
    `  data-key="${key}"`,
    '  data-api="/z/api/v1/"',
    '  src="/z/script.js"',
    "></script>",
  ].join("\n")
}

function eventCurl(secretKey: string | null) {
  const key = secretKey ?? "zsk_…"
  return [
    "curl -X POST \\",
    `  ${origin()}/api/v1/events \\`,
    `  -H "Authorization: Bearer ${key}" \\`,
    '  -H "Content-Type: application/json" \\',
    `  -d '{"name":"checkout_started","userId":"user_123"}'`,
  ].join("\n")
}

function CodeBlock({ language, source }: { language: string; source: string }) {
  return (
    <div className="bg-secondary">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xs text-muted-foreground">{language}</span>
        <CopyButton value={source} label="Copy snippet" className="ml-auto" />
      </div>
      <pre className="no-scrollbar overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed">
        <code>{source}</code>
      </pre>
    </div>
  )
}

export function ServerSettings({
  slug,
  siteId,
  site,
  writeKey,
  canManage,
}: {
  slug: string
  siteId: string
  site: Site
  writeKey: string | null
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [secretKey, setSecretKey] = useState<string | null>(null)
  const [note, setNote] = useState(
    site.hasSecretKey
      ? "Already generated. Rotate to replace it."
      : "Shown once."
  )
  const [rotateOpen, setRotateOpen] = useState(false)
  const [proxy, setProxy] = useState<ProxyKind>("nextjs")
  const upstream = origin()

  const rotate = useMutation({
    mutationFn: () => replaceSecretKey(slug, siteId),
    onSuccess: async (result) => {
      setSecretKey(result.secretKey)
      setNote(
        site.hasSecretKey
          ? "Shown once. The previous key no longer works."
          : "Shown once."
      )
      setRotateOpen(false)
      await queryClient.invalidateQueries({ queryKey: ["sites", slug] })
    },
    onError: (error) => toast.error(error.message),
  })

  if (!canManage || site.revokedAt !== null) return null

  return (
    <>
      <section className="space-y-3">
        <h2 className="text-sm text-muted-foreground">Server events</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Send events from your backend with a secret key. Prefer{" "}
          <code className="font-mono text-xs">userId</code> so the event joins
          the same visitor as{" "}
          <code className="font-mono text-xs">zani.identify()</code>.
        </p>
        {secretKey ? (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs">
                <span className="whitespace-nowrap">{secretKey}</span>
              </div>
              <CopyButton value={secretKey} label="Copy secret key" />
            </div>
            <p className="text-sm text-muted-foreground">{note}</p>
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">{note}</p>
        )}
        <CodeBlock language="bash" source={eventCurl(secretKey)} />
        <Button
          type="button"
          variant="outline"
          disabled={rotate.isPending}
          onClick={() => {
            rotate.reset()
            if (site.hasSecretKey || secretKey) setRotateOpen(true)
            else void rotate.mutate()
          }}
        >
          {site.hasSecretKey || secretKey ? "Rotate secret key" : "Generate secret key"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm text-muted-foreground">First-party proxy</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Proxy{" "}
          <code className="font-mono text-xs">/z/*</code> to this origin so
          browsers send pageviews to your domain. Forward{" "}
          <code className="font-mono text-xs">x-zani-ip</code>,{" "}
          <code className="font-mono text-xs">x-zani-country</code>, and{" "}
          <code className="font-mono text-xs">x-zani-city</code> so geo stays
          accurate.
        </p>
        <Segmented
          label="Proxy"
          options={proxies}
          value={proxy}
          labels={proxyLabels}
          onChange={setProxy}
        />
        <CodeBlock
          language={proxy === "nextjs" ? "ts" : "js"}
          source={
            proxy === "nextjs"
              ? nextProxySource(upstream)
              : cloudflareProxySource(upstream)
          }
        />
        <CodeBlock language="html" source={proxyScript(writeKey)} />
      </section>

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the secret key?</AlertDialogTitle>
            <AlertDialogDescription>
              The current key stops working. Update every server that posts
              events.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotate.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={rotate.isPending}
              onClick={() => void rotate.mutate()}
            >
              {rotate.isPending ? "Rotating…" : "Rotate key"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

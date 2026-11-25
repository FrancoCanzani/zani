import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { CheckCircle2Icon, CircleIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { toast } from "sonner"

import { CopyButton } from "@components/install-snippet"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"

import { siteSetupQueryOptions, type SiteSetup } from "@features/sites/api"
import { formatRelative } from "@lib/utils"

import {
  connectStripe,
  disconnectStripe,
  stripeOauthUrl,
  stripeStatusQueryOptions,
  syncStripeStep,
  updateStripeWebhookSecret,
  type StripeStatus,
  type SyncPhase,
} from "./api"
import { Segmented } from "./segmented"

const webhookEvents = [
  "customer.created",
  "customer.updated",
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
]

const phaseLabels: Record<SyncPhase, string> = {
  customers: "Importing customers",
  checkout_sessions: "Linking checkouts",
  subscriptions: "Importing subscriptions",
  invoices: "Importing invoices",
  recompute: "Building MRR",
  done: "Done",
}

type Framework = "javascript" | "react" | "next" | "vue" | "types"

const frameworks: readonly Framework[] = [
  "javascript",
  "react",
  "next",
  "vue",
  "types",
]

const frameworkLabels: Record<Framework, string> = {
  javascript: "JavaScript",
  react: "React",
  next: "Next.js",
  vue: "Vue",
  types: "TypeScript",
}

function identifySnippet(framework: Framework, origin: string) {
  switch (framework) {
    case "javascript":
      return `// After the signup request succeeds
zani.identify(user.id, { email: user.email })`
    case "react":
      return `async function onSubmit(values) {
  const user = await createAccount(values)
  window.zani?.identify(user.id, { email: user.email })
  navigate("/welcome")
}`
    case "next":
      return `// app/layout.tsx
import Script from "next/script"

<Script defer data-key="YOUR_WRITE_KEY" src="${origin}/script.js" />

// In the client component that handles signup
"use client"
const user = await createAccount(values)
window.zani?.identify(user.id, { email: user.email })`
    case "vue":
      return `async function onSubmit() {
  const user = await createAccount(form)
  window.zani?.identify(user.id, { email: user.email })
  router.push("/welcome")
}`
    case "types":
      return `declare global {
  interface Window {
    zani?: {
      identify(userId: string, traits?: { email?: string }): void
      track(name: string, props?: Record<string, string | number | boolean>): void
    }
  }
}

export {}`
    default: {
      const exhaustive: never = framework
      return exhaustive
    }
  }
}

type StripeLink = "checkout" | "customer"

const stripeLinks: readonly StripeLink[] = ["checkout", "customer"]

const stripeLinkLabels: Record<StripeLink, string> = {
  checkout: "Checkout",
  customer: "Customer",
}

const stripeSnippets: Record<StripeLink, string> = {
  checkout: `await stripe.checkout.sessions.create({
  mode: "subscription",
  client_reference_id: user.id,
  customer_email: user.email,
  line_items: [{ price: priceId, quantity: 1 }],
  success_url,
  cancel_url,
})`,
  customer: `await stripe.customers.create({
  email: user.email,
  metadata: { zani_user_id: user.id },
})`,
}

type ConnectedStatus = Extract<StripeStatus, { connected: true }>

type StepState = "done" | "waiting" | "todo"

function formatWhen(ms: number | null) {
  if (ms === null) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms)
}

export function StepStatus({
  state,
  label,
}: {
  state: StepState
  label: string
}) {
  return (
    <span
      className={`ml-auto flex shrink-0 items-center gap-1.5 text-xs ${
        state === "done" ? "text-emerald-700" : "text-muted-foreground"
      }`}
    >
      {state === "done" ? (
        <CheckCircle2Icon aria-hidden className="size-3.5" />
      ) : state === "waiting" ? (
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500 opacity-60" />
          <span className="relative inline-flex size-2 rounded-full bg-amber-500" />
        </span>
      ) : (
        <CircleIcon aria-hidden className="size-3.5" />
      )}
      {label}
    </span>
  )
}

export function Step({
  index,
  title,
  state,
  status,
  children,
}: {
  index: number
  title: string
  state: StepState
  status: string
  children: ReactNode
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
          {index}
        </span>
        <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>
        <StepStatus state={state} label={status} />
      </div>
      {children}
    </div>
  )
}

function CodeBlock({
  code,
  label,
  language,
}: {
  code: string
  label: string
  language: string
}) {
  return (
    <div className="bg-secondary">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xs text-muted-foreground">{language}</span>
        <CopyButton value={code} label={label} className="ml-auto" />
      </div>
      <pre className="no-scrollbar overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

export function RevenueSettings({
  slug,
  siteId,
  domain,
  canManage,
}: {
  slug: string
  siteId: string
  domain: string
  canManage: boolean
}) {
  const { data } = useSuspenseQuery(stripeStatusQueryOptions(slug, siteId))
  const stripe = data.stripe
  const { data: setupData } = useQuery({
    ...siteSetupQueryOptions(slug, siteId),
    refetchInterval: (query) =>
      query.state.data?.setup.signups ? false : 5_000,
  })
  const setup = setupData?.setup
  const webhookUrl = `${window.location.origin}/api/v1/stripe-webhooks/${siteId}`

  const identifyState: StepState = setup?.signups ? "done" : "waiting"
  const identifyLabel = setup?.signups
    ? `${setup.signups.toLocaleString()} ${setup.signups === 1 ? "signup" : "signups"}`
    : "Waiting for a signup"

  const stripeState: StepState = !stripe.connected
    ? "todo"
    : stripe.syncedAt === null
      ? "waiting"
      : "done"
  const stripeLabel = !stripe.connected
    ? "Not connected"
    : stripe.syncedAt === null
      ? "Needs first sync"
      : "Connected"

  const webhookState: StepState =
    stripe.connected && stripe.webhookConfigured ? "done" : "todo"

  return (
    <section id="revenue" className="scroll-mt-24 space-y-3">
      <h2 className="text-sm text-muted-foreground">Revenue</h2>

      <Step
        index={1}
        title="Identify signups"
        state={identifyState}
        status={identifyLabel}
      >
        <IdentifyStep domain={domain} setup={setup ?? null} />
      </Step>

      <Step
        index={2}
        title="Connect Stripe"
        state={stripeState}
        status={stripeLabel}
      >
        {stripe.connected ? (
          <StripeConnected
            slug={slug}
            siteId={siteId}
            status={stripe}
            linkedCustomers={setup?.linkedCustomers ?? 0}
            canManage={canManage}
          />
        ) : canManage ? (
          <StripeConnect
            slug={slug}
            siteId={siteId}
            oauthAvailable={stripe.oauthAvailable}
          />
        ) : (
          <EmptyNote>An owner or admin can connect Stripe.</EmptyNote>
        )}
      </Step>

      <Step
        index={3}
        title="Live updates"
        state={webhookState}
        status={webhookState === "done" ? "Webhook saved" : "Optional"}
      >
        <WebhookStep
          slug={slug}
          siteId={siteId}
          status={stripe.connected ? stripe : null}
          canManage={canManage}
          webhookUrl={webhookUrl}
        />
      </Step>
    </section>
  )
}

function IdentifyStep({
  domain,
  setup,
}: {
  domain: string
  setup: SiteSetup | null
}) {
  const [framework, setFramework] = useState<Framework>("javascript")
  const [stripeLink, setStripeLink] = useState<StripeLink>("checkout")

  return (
    <div className="space-y-4">
      {setup?.lastIdentifyAt ? (
        <p className="text-sm text-muted-foreground">
          Last signup {formatRelative(setup.lastIdentifyAt)}. Attribution is
          saved at signup, so earlier visits keep their source.
        </p>
      ) : (
        <EmptyNote>
          No signups yet. Add the call below, then sign up on {domain} with a
          test account. It shows up here within a few seconds.
        </EmptyNote>
      )}
      <div className="space-y-2">
        <Segmented
          label="Framework"
          options={frameworks}
          value={framework}
          labels={frameworkLabels}
          onChange={setFramework}
        />
        <CodeBlock
          code={identifySnippet(framework, window.location.origin)}
          label="Copy identify snippet"
          language={framework === "javascript" ? "js" : "tsx"}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Then pass the same id to Stripe so customers link to their signup.
          Customers with a matching email are linked too.
        </p>
        <Segmented
          label="Stripe link"
          options={stripeLinks}
          value={stripeLink}
          labels={stripeLinkLabels}
          onChange={setStripeLink}
        />
        <CodeBlock
          code={stripeSnippets[stripeLink]}
          label="Copy Stripe snippet"
          language="js"
        />
      </div>
    </div>
  )
}

function StripeConnect({
  slug,
  siteId,
  oauthAvailable,
}: {
  slug: string
  siteId: string
  oauthAvailable: boolean
}) {
  const [useKey, setUseKey] = useState(!oauthAvailable)

  const oauth = useMutation({
    mutationFn: () => stripeOauthUrl(slug, siteId),
    onSuccess: ({ url }) => {
      window.location.assign(url)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="space-y-3">
      <EmptyNote>
        No Stripe account connected. Zani reads customers, subscriptions, and
        invoices to build MRR. It never writes to Stripe.
      </EmptyNote>
      {oauthAvailable ? (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            disabled={oauth.isPending}
            onClick={() => oauth.mutate()}
          >
            {oauth.isPending ? "Opening Stripe…" : "Connect with Stripe"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            onClick={() => setUseKey((value) => !value)}
          >
            {useKey ? "Hide restricted key" : "Use a restricted key instead"}
          </button>
        </div>
      ) : null}
      {useKey ? <StripeKeyForm slug={slug} siteId={siteId} /> : null}
    </div>
  )
}

function StripeKeyForm({ slug, siteId }: { slug: string; siteId: string }) {
  const queryClient = useQueryClient()
  const [apiKey, setApiKey] = useState("")

  const connect = useMutation({
    mutationFn: () => connectStripe(slug, siteId, { apiKey: apiKey.trim() }),
    onSuccess: (result) => {
      queryClient.setQueryData(
        stripeStatusQueryOptions(slug, siteId).queryKey,
        result
      )
      setApiKey("")
      toast.success("Stripe connected. Run the first sync to import history.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        connect.mutate()
      }}
    >
      <Field>
        <FieldLabel htmlFor="stripe-key">Restricted key</FieldLabel>
        <div className="flex gap-2">
          <Input
            id="stripe-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="rk_live_…"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <Button type="submit" disabled={connect.isPending || !apiKey.trim()}>
            {connect.isPending ? "Connecting…" : "Connect"}
          </Button>
        </div>
        <FieldDescription>
          Read access to Customers, Checkout Sessions, Subscriptions, and
          Invoices. Stored encrypted; nothing is written to Stripe.
        </FieldDescription>
      </Field>
    </form>
  )
}

function StripeConnected({
  slug,
  siteId,
  status,
  linkedCustomers,
  canManage,
}: {
  slug: string
  siteId: string
  status: ConnectedStatus
  linkedCustomers: number
  canManage: boolean
}) {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<SyncPhase | null>(null)
  const [disconnectOpen, setDisconnectOpen] = useState(false)

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: stripeStatusQueryOptions(slug, siteId).queryKey,
      }),
      queryClient.invalidateQueries({
        queryKey: siteSetupQueryOptions(slug, siteId).queryKey,
      }),
      queryClient.invalidateQueries({ queryKey: ["revenue", slug, siteId] }),
    ])
  }

  const sync = useMutation({
    mutationFn: async () => {
      let restart = status.syncPhase === "done"
      for (;;) {
        const { sync: step } = await syncStripeStep(slug, siteId, restart)
        restart = false
        setPhase(step.phase)
        if (step.done) return
      }
    },
    onSuccess: async () => {
      toast.success("Stripe sync finished.")
      await refresh()
    },
    onError: async (error) => {
      toast.error(error.message)
      await refresh()
    },
    onSettled: () => setPhase(null),
  })

  const disconnect = useMutation({
    mutationFn: () => disconnectStripe(slug, siteId),
    onSuccess: async () => {
      setDisconnectOpen(false)
      await refresh()
      toast.success("Stripe disconnected.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const syncLabel = sync.isPending
    ? `${phaseLabels[phase ?? status.syncPhase]}…`
    : status.syncPhase === "done"
      ? "Sync again"
      : status.syncedAt === null && status.syncPhase === "customers"
        ? "Run first sync"
        : "Resume sync"

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">
            {status.method === "oauth" ? "Account" : "Key"}
          </dt>
          <dd className="flex min-w-0 items-center gap-2 font-mono">
            <span className="truncate">
              {status.method === "oauth"
                ? status.account
                : `••••${status.apiKeyHint}`}
            </span>
            <Badge variant="outline">{status.livemode ? "live" : "test"}</Badge>
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Customers linked</dt>
          <dd className="font-mono tabular-nums">
            {linkedCustomers.toLocaleString()} /{" "}
            {status.customers.toLocaleString()}
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Last full sync</dt>
          <dd>{formatWhen(status.syncedAt)}</dd>
        </div>
      </dl>
      {status.syncError ? (
        <p className="text-sm text-destructive">{status.syncError}</p>
      ) : status.syncedAt === null ? (
        <EmptyNote>
          Connected, but nothing is imported yet. Run the first sync to pull
          customers and invoice history.
        </EmptyNote>
      ) : status.customers === 0 ? (
        <EmptyNote>
          The sync finished and found no customers in this Stripe account.
        </EmptyNote>
      ) : linkedCustomers === 0 ? (
        <EmptyNote>
          None of these customers is linked to a signup yet. Pass the user id to
          Stripe as shown in step 1, or make sure signups send an email that
          matches the Stripe customer.
        </EmptyNote>
      ) : null}
      {canManage ? (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={sync.isPending}
            onClick={() => sync.mutate()}
          >
            {syncLabel}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setDisconnectOpen(true)}
          >
            Disconnect
          </Button>
        </div>
      ) : null}

      <AlertDialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect Stripe?</AlertDialogTitle>
            <AlertDialogDescription>
              Imported customers and revenue history for this site are deleted.
              Signups stay.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disconnect.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate()}
            >
              {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function WebhookStep({
  slug,
  siteId,
  status,
  canManage,
  webhookUrl,
}: {
  slug: string
  siteId: string
  status: ConnectedStatus | null
  canManage: boolean
  webhookUrl: string
}) {
  const queryClient = useQueryClient()
  const [webhookSecret, setWebhookSecret] = useState("")

  const saveSecret = useMutation({
    mutationFn: () =>
      updateStripeWebhookSecret(slug, siteId, webhookSecret.trim() || null),
    onSuccess: (result) => {
      queryClient.setQueryData(
        stripeStatusQueryOptions(slug, siteId).queryKey,
        result
      )
      setWebhookSecret("")
      toast.success("Webhook secret saved.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <div className="space-y-3">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Optional. Without a webhook, revenue updates when you sync. Add an
        endpoint in Stripe with this URL and these events.
      </p>
      <div className="flex items-center gap-1 bg-secondary px-3 py-2">
        <span className="no-scrollbar min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap">
          {webhookUrl}
        </span>
        <CopyButton value={webhookUrl} label="Copy webhook URL" />
      </div>
      <div className="flex flex-wrap gap-1">
        {webhookEvents.map((name) => (
          <Badge key={name} variant="outline" className="font-mono">
            {name}
          </Badge>
        ))}
      </div>
      {status ? (
        <>
          <p className="text-sm text-muted-foreground">
            {status.webhookConfigured
              ? `Last event: ${formatWhen(status.lastWebhookAt).toLowerCase()}.`
              : "No signing secret saved yet."}
          </p>
          {canManage ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                saveSecret.mutate()
              }}
            >
              <Field>
                <FieldLabel htmlFor="stripe-webhook">Signing secret</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="stripe-webhook"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                      status.webhookConfigured
                        ? "Saved. Paste to replace."
                        : "whsec_…"
                    }
                    value={webhookSecret}
                    onChange={(event) => setWebhookSecret(event.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={saveSecret.isPending || !webhookSecret.trim()}
                  >
                    Save
                  </Button>
                </div>
              </Field>
            </form>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Connect Stripe first, then save the endpoint’s signing secret here.
        </p>
      )}
    </div>
  )
}

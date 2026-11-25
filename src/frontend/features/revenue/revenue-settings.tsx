import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
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

import {
  connectStripe,
  disconnectStripe,
  stripeStatusQueryOptions,
  syncStripeStep,
  updateStripeWebhookSecret,
  type StripeStatus,
  type SyncPhase,
} from "./api"

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

const identifySnippet = `// After a successful signup
zani.identify(user.id, { email: user.email })

// Stripe Checkout: pass the same id
client_reference_id: user.id
// or on the customer
metadata: { zani_user_id: user.id }`

type ConnectedStatus = Extract<StripeStatus, { connected: true }>

function formatWhen(ms: number | null) {
  if (ms === null) return "Never"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms)
}

function Step({
  index,
  title,
  done,
  children,
}: {
  index: number
  title: string
  done?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border/70 p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
          {index}
        </span>
        <h3 className="text-[15px] font-medium tracking-tight">{title}</h3>
        {done ? (
          <Badge variant="secondary" className="ml-auto">
            Connected
          </Badge>
        ) : null}
      </div>
      {children}
    </div>
  )
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div className="bg-secondary">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xs text-muted-foreground">js</span>
        <CopyButton value={code} label={label} className="ml-auto" />
      </div>
      <pre className="no-scrollbar overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

export function RevenueSettings({
  slug,
  siteId,
  canManage,
}: {
  slug: string
  siteId: string
  canManage: boolean
}) {
  const { data } = useSuspenseQuery(stripeStatusQueryOptions(slug, siteId))
  const webhookUrl = `${window.location.origin}/api/v1/stripe-webhooks/${siteId}`
  const stripe = data.stripe

  return (
    <section id="revenue" className="scroll-mt-24 space-y-3">
      <h2 className="text-sm text-muted-foreground">Revenue</h2>

      <Step index={1} title="Identify signups">
        <p className="text-sm leading-relaxed text-muted-foreground">
          The script keeps each visitor’s first and last source on your domain.
          Call identify after signup and pass the same id to Stripe. Customers
          with a matching email are linked too.
        </p>
        <CodeBlock code={identifySnippet} label="Copy snippet" />
      </Step>

      <Step index={2} title="Connect Stripe" done={stripe.connected}>
        {stripe.connected ? (
          <StripeConnected
            slug={slug}
            siteId={siteId}
            status={stripe}
            canManage={canManage}
          />
        ) : canManage ? (
          <StripeConnectForm slug={slug} siteId={siteId} />
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin can connect Stripe.
          </p>
        )}
      </Step>

      <Step index={3} title="Live updates">
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

function StripeConnectForm({ slug, siteId }: { slug: string; siteId: string }) {
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
  canManage,
}: {
  slug: string
  siteId: string
  status: ConnectedStatus
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
          <dt className="text-xs text-muted-foreground">Key</dt>
          <dd className="flex items-center gap-2 font-mono">
            ••••{status.apiKeyHint}
            <Badge variant="outline">{status.livemode ? "live" : "test"}</Badge>
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Customers</dt>
          <dd className="font-mono tabular-nums">{status.customers}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-xs text-muted-foreground">Last full sync</dt>
          <dd>{formatWhen(status.syncedAt)}</dd>
        </div>
      </dl>
      {status.syncError ? (
        <p className="text-sm text-destructive">{status.syncError}</p>
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

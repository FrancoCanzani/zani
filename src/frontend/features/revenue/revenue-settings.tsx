import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

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
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@components/ui/field"
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

function formatWhen(ms: number | null) {
  if (ms === null) return "never"
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(ms)
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

  return (
    <section id="revenue" className="scroll-mt-24 space-y-6">
      <div className="space-y-3">
        <h2 className="text-sm text-muted-foreground">Revenue attribution</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The script keeps the visitor’s first and last source in local storage
          on your domain. Call identify when someone signs up, and pass the same
          id to Stripe. Customers with a matching email are linked too.
        </p>
        <pre className="no-scrollbar overflow-x-auto bg-secondary px-3 py-3 font-mono text-xs leading-relaxed">
          <code>{identifySnippet}</code>
        </pre>
      </div>

      {data.stripe.connected ? (
        <StripeConnected
          slug={slug}
          siteId={siteId}
          status={data.stripe}
          canManage={canManage}
          webhookUrl={webhookUrl}
        />
      ) : canManage ? (
        <StripeConnectForm
          slug={slug}
          siteId={siteId}
          webhookUrl={webhookUrl}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          Stripe is not connected. An owner or admin can connect it.
        </p>
      )}
    </section>
  )
}

function WebhookInstructions({ webhookUrl }: { webhookUrl: string }) {
  return (
    <div className="space-y-2 text-sm text-muted-foreground">
      <p>For live updates, add a webhook endpoint in Stripe pointing to:</p>
      <p className="font-mono text-xs break-all text-foreground">
        {webhookUrl}
      </p>
      <p>Events: {webhookEvents.join(", ")}.</p>
    </div>
  )
}

function StripeConnectForm({
  slug,
  siteId,
  webhookUrl,
}: {
  slug: string
  siteId: string
  webhookUrl: string
}) {
  const queryClient = useQueryClient()
  const [apiKey, setApiKey] = useState("")
  const [webhookSecret, setWebhookSecret] = useState("")

  const connect = useMutation({
    mutationFn: () =>
      connectStripe(slug, siteId, {
        apiKey: apiKey.trim(),
        webhookSecret: webhookSecret.trim() || undefined,
      }),
    onSuccess: (result) => {
      queryClient.setQueryData(
        stripeStatusQueryOptions(slug, siteId).queryKey,
        result
      )
      setApiKey("")
      setWebhookSecret("")
      toast.success("Stripe connected. Run a sync to import history.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        connect.mutate()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="stripe-key">Restricted key</FieldLabel>
          <Input
            id="stripe-key"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="rk_live_…"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <FieldDescription>
            Create a restricted key with read access to Customers, Checkout
            Sessions, Subscriptions, and Invoices. It is stored encrypted.
          </FieldDescription>
        </Field>
        <Field>
          <FieldLabel htmlFor="stripe-webhook">
            Webhook signing secret (optional)
          </FieldLabel>
          <Input
            id="stripe-webhook"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="whsec_…"
            value={webhookSecret}
            onChange={(event) => setWebhookSecret(event.target.value)}
          />
        </Field>
      </FieldGroup>
      <WebhookInstructions webhookUrl={webhookUrl} />
      <Button type="submit" disabled={connect.isPending || !apiKey.trim()}>
        {connect.isPending ? "Connecting…" : "Connect Stripe"}
      </Button>
    </form>
  )
}

function StripeConnected({
  slug,
  siteId,
  status,
  canManage,
  webhookUrl,
}: {
  slug: string
  siteId: string
  status: Extract<StripeStatus, { connected: true }>
  canManage: boolean
  webhookUrl: string
}) {
  const queryClient = useQueryClient()
  const [phase, setPhase] = useState<SyncPhase | null>(null)
  const [webhookSecret, setWebhookSecret] = useState("")
  const [disconnectOpen, setDisconnectOpen] = useState(false)
  const statusKey = stripeStatusQueryOptions(slug, siteId).queryKey

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: statusKey }),
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

  const saveSecret = useMutation({
    mutationFn: () =>
      updateStripeWebhookSecret(slug, siteId, webhookSecret.trim() || null),
    onSuccess: (result) => {
      queryClient.setQueryData(statusKey, result)
      setWebhookSecret("")
      toast.success("Webhook secret saved.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
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

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <dt className="text-muted-foreground">Key</dt>
          <dd className="flex items-center gap-2 font-mono">
            ••••{status.apiKeyHint}
            <Badge variant="outline">{status.livemode ? "live" : "test"}</Badge>
          </dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Customers</dt>
          <dd className="font-mono tabular-nums">{status.customers}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Last full sync</dt>
          <dd>{formatWhen(status.syncedAt)}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-muted-foreground">Webhook</dt>
          <dd>
            {status.webhookConfigured
              ? `last event ${formatWhen(status.lastWebhookAt)}`
              : "not configured"}
          </dd>
        </div>
      </dl>
      {status.syncError ? (
        <p className="text-sm text-destructive">{status.syncError}</p>
      ) : null}

      {canManage ? (
        <>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={sync.isPending}
              onClick={() => sync.mutate()}
            >
              {sync.isPending
                ? `${phaseLabels[phase ?? status.syncPhase]}…`
                : status.syncPhase === "done"
                  ? "Sync again"
                  : status.syncedAt === null && status.syncPhase === "customers"
                    ? "Run first sync"
                    : "Resume sync"}
            </Button>
          </div>

          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              saveSecret.mutate()
            }}
          >
            <WebhookInstructions webhookUrl={webhookUrl} />
            <Field>
              <FieldLabel htmlFor="stripe-webhook-update">
                Webhook signing secret
              </FieldLabel>
              <Input
                id="stripe-webhook-update"
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
            </Field>
            <Button
              type="submit"
              variant="outline"
              disabled={saveSecret.isPending || !webhookSecret.trim()}
            >
              Save secret
            </Button>
          </form>

          <Button
            type="button"
            variant="destructive"
            onClick={() => setDisconnectOpen(true)}
          >
            Disconnect Stripe
          </Button>
        </>
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

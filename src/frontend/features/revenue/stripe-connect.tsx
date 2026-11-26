import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { EmptyNote } from "@components/setup-step"
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

import { siteSetupQueryOptions } from "@features/sites/api"
import { formatDateTime } from "@lib/utils"

import {
  connectStripe,
  disconnectStripe,
  stripeOauthUrl,
  stripeStatusQueryOptions,
  syncStripeStep,
  type ConnectedStripeStatus,
  type SyncPhase,
} from "./api"

const phaseLabels: Record<SyncPhase, string> = {
  customers: "Importing customers",
  checkout_sessions: "Linking checkouts",
  subscriptions: "Importing subscriptions",
  invoices: "Importing invoices",
  charges: "Importing payments",
  recompute: "Building MRR",
  done: "Done",
}

export function StripeConnect({
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

const restrictedKeyUrl = (() => {
  const params = new URLSearchParams({
    name: "Zani",
    thirdparty_integration_name: "Zani",
    thirdparty_integration_url: window.location.origin,
  })
  // The dashboard's checkout slug differs from the documented one, so ask for both.
  for (const permission of [
    "rak_customer_read",
    "rak_subscription_read",
    "rak_invoice_read",
    "rak_charge_read",
    "rak_checkout_session_read",
    "rak_bucket_checkout_read",
  ]) {
    params.append("permissions[]", permission)
  }
  return `https://dashboard.stripe.com/apikeys/create?${params}`
})()

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
          <a
            href={restrictedKeyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Create the key in Stripe
          </a>{" "}
          with read access to Customers, Checkout Sessions, Subscriptions,
          Invoices, and Charges already ticked, then paste it here. Stored encrypted; nothing
          is written to Stripe.
        </FieldDescription>
      </Field>
    </form>
  )
}

export function StripeConnected({
  slug,
  siteId,
  status,
  linkedCustomers,
  canManage,
}: {
  slug: string
  siteId: string
  status: ConnectedStripeStatus
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
          <dd>{formatDateTime(status.syncedAt)}</dd>
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

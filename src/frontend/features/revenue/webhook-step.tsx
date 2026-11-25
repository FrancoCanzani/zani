import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { toast } from "sonner"

import { CopyButton } from "@components/install-snippet"
import { Badge } from "@components/ui/badge"
import { Button } from "@components/ui/button"
import { Field, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"

import { formatDateTime } from "@lib/utils"

import {
  stripeStatusQueryOptions,
  updateStripeWebhookSecret,
  type ConnectedStripeStatus,
} from "./api"

const webhookEvents = [
  "customer.created",
  "customer.updated",
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
]

export function WebhookStep({
  slug,
  siteId,
  status,
  canManage,
  webhookUrl,
}: {
  slug: string
  siteId: string
  status: ConnectedStripeStatus | null
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
              ? `Last event: ${formatDateTime(status.lastWebhookAt).toLowerCase()}.`
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

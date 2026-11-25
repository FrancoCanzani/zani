import { useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { EmptyNote, Step, type StepState } from "@components/setup-step"

import { siteSetupQueryOptions } from "@features/sites/api"

import { stripeStatusQueryOptions } from "./api"
import { IdentifyStep } from "./identify-step"
import { StripeConnect, StripeConnected } from "./stripe-connect"
import { WebhookStep } from "./webhook-step"

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
        index={2}
        title="Identify signups"
        state={identifyState}
        status={identifyLabel}
      >
        <IdentifyStep domain={domain} setup={setup ?? null} />
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

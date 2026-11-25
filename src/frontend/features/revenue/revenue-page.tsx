import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"
import { workspaceQueryOptions } from "@features/workspaces/api"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"
import { fieldErrors } from "@lib/utils"

import {
  connectStripe,
  disconnectStripe,
  formatMoney,
  revenueQueryOptions,
  simulateStripeRevenue,
  stripeConnectionQueryOptions,
  syncStripe,
} from "./api"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/revenue")

const connectSchema = z.object({
  secretKey: z.string().trim().min(1, "Paste a Stripe secret key."),
  webhookSecret: z.string().trim().min(1, "Paste the webhook signing secret."),
})

export function RevenuePage() {
  const { slug } = routeApi.useParams()
  const queryClient = useQueryClient()
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const { data: stripeData } = useSuspenseQuery(
    stripeConnectionQueryOptions(slug)
  )
  const { data: revenue } = useSuspenseQuery(revenueQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role !== null && canManageBusiness(role)

  const connect = useMutation({
    mutationFn: (body: { secretKey: string; webhookSecret: string }) =>
      connectStripe(slug, body),
    onSuccess: async (result) => {
      toast.success(`Connected · synced ${result.synced} subscriptions`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stripe", slug] }),
        queryClient.invalidateQueries({ queryKey: ["revenue", slug] }),
      ])
    },
    onError: (error) => toast.error(error.message),
  })

  const disconnect = useMutation({
    mutationFn: () => disconnectStripe(slug),
    onSuccess: async () => {
      toast.success("Stripe disconnected")
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stripe", slug] }),
        queryClient.invalidateQueries({ queryKey: ["revenue", slug] }),
      ])
    },
    onError: (error) => toast.error(error.message),
  })

  const sync = useMutation({
    mutationFn: () => syncStripe(slug),
    onSuccess: async (result) => {
      toast.success(`Synced ${result.synced} subscriptions`)
      await queryClient.invalidateQueries({ queryKey: ["revenue", slug] })
    },
    onError: (error) => toast.error(error.message),
  })

  const simulate = useMutation({
    mutationFn: () => simulateStripeRevenue(slug),
    onSuccess: async (result) => {
      toast.success(
        `Simulated ${result.signups} signups · ${result.customers} customers`
      )
      await queryClient.invalidateQueries({ queryKey: ["revenue", slug] })
    },
    onError: (error) => toast.error(error.message),
  })

  const form = useForm({
    defaultValues: { secretKey: "", webhookSecret: "" },
    validators: { onSubmit: connectSchema },
    onSubmit: async ({ value, formApi }) => {
      await connect.mutateAsync({
        secretKey: value.secretKey.trim(),
        webhookSecret: value.webhookSecret.trim(),
      })
      formApi.reset()
    },
  })

  const currency = revenue.currency || "usd"
  const origin =
    typeof window === "undefined" ? "" : window.location.origin

  return (
    <div className="flex flex-col gap-10">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">Revenue</h1>
          <p className="text-sm text-muted-foreground">
            First-touch source → paying customers.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="xs">
            <Link to="/businesses/$slug" params={{ slug }}>
              Sites
            </Link>
          </Button>
          {import.meta.env.DEV && canManage ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={simulate.isPending}
              onClick={() => simulate.mutate()}
            >
              {simulate.isPending ? "Simulating…" : "Simulate"}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="MRR" value={formatMoney(revenue.mrrCents, currency)} />
        <Kpi label="Customers" value={String(revenue.customers)} />
        <Kpi label="Signups" value={String(revenue.signups)} />
        <Kpi label="ARPU" value={formatMoney(revenue.arpuCents, currency)} />
        <Kpi label="Churn" value={`${revenue.churnRate}%`} />
      </div>

      <section className="space-y-3">
        <h2 className="text-sm text-muted-foreground">Source → MRR</h2>
        {revenue.sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No attributed revenue yet. Identify users and connect Stripe.
          </p>
        ) : (
          <div className="overflow-x-auto border-y">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Source</th>
                  <th className="py-2 pr-4 font-medium">Signups</th>
                  <th className="py-2 pr-4 font-medium">Customers</th>
                  <th className="py-2 font-medium">MRR</th>
                </tr>
              </thead>
              <tbody>
                {revenue.sources.map((row) => (
                  <tr key={row.source} className="border-b border-border/60">
                    <td className="py-2 pr-4">{row.source}</td>
                    <td className="py-2 pr-4 font-mono tabular-nums">
                      {row.signups}
                    </td>
                    <td className="py-2 pr-4 font-mono tabular-nums">
                      {row.customers}
                    </td>
                    <td className="py-2 font-mono tabular-nums">
                      {formatMoney(row.mrrCents, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {revenue.matchedCustomers < revenue.customers ? (
          <p className="text-sm text-muted-foreground">
            {revenue.customers - revenue.matchedCustomers} paying customers
            unmatched — call{" "}
            <code className="font-mono text-xs">zani.identify</code> with the
            same email or user id Stripe stores in metadata.
          </p>
        ) : null}
      </section>

      <section className="max-w-lg space-y-4">
        <div className="space-y-1">
          <h2 className="text-sm text-muted-foreground">Stripe</h2>
          {stripeData.connected && stripeData.connection ? (
            <p className="text-sm text-muted-foreground">
              Connected to {stripeData.connection.stripeAccountId}
              {stripeData.connection.livemode ? "" : " (test)"}.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Paste a restricted key (read customers + subscriptions) and a
              webhook signing secret. We never take a cut.
            </p>
          )}
        </div>

        {stripeData.connected && stripeData.connection ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Webhook endpoint</p>
              <p className="break-all font-mono text-xs">
                {origin}
                {stripeData.connection.webhookPath}
              </p>
              <p className="text-xs text-muted-foreground">
                Events: customer.*, customer.subscription.*, invoice.paid
              </p>
            </div>
            {canManage ? (
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={sync.isPending}
                  onClick={() => sync.mutate()}
                >
                  {sync.isPending ? "Syncing…" : "Sync now"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate()}
                >
                  {disconnect.isPending ? "Disconnecting…" : "Disconnect"}
                </Button>
              </div>
            ) : null}
          </div>
        ) : canManage ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              void form.handleSubmit()
            }}
          >
            <FieldGroup>
              <form.Field name="secretKey">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={field.name}>Secret key</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="rk_live_… or sk_live_…"
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <form.Field name="webhookSecret">
                {(field) => (
                  <Field data-invalid={field.state.meta.errors.length > 0}>
                    <FieldLabel htmlFor={field.name}>Webhook secret</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="whsec_…"
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
            <form.Subscribe selector={(state) => state.isSubmitting}>
              {(isSubmitting) => (
                <Button type="submit" disabled={isSubmitting || connect.isPending}>
                  {isSubmitting || connect.isPending
                    ? "Connecting…"
                    : "Connect Stripe"}
                </Button>
              )}
            </form.Subscribe>
          </form>
        ) : (
          <p className="text-sm text-muted-foreground">
            An owner or admin connects Stripe.
          </p>
        )}
      </section>
    </div>
  )
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/80 px-3 py-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-3xl font-medium tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  )
}

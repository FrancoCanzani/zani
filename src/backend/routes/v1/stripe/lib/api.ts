type StripeList<T> = {
  data: T[]
  has_more: boolean
}

export type StripeAccount = {
  id: string
  livemode?: boolean
}

export type StripeCustomer = {
  id: string
  email: string | null
  name: string | null
  metadata?: Record<string, string>
  created?: number
}

export type StripePrice = {
  id: string
  unit_amount: number | null
  currency: string
  recurring: {
    interval: string
    interval_count: number
  } | null
}

export type StripeSubscriptionItem = {
  quantity: number | null
  price: StripePrice | string
}

export type StripeSubscription = {
  id: string
  customer: string | StripeCustomer
  status: string
  cancel_at_period_end: boolean
  created: number
  currency: string
  items: {
    data: StripeSubscriptionItem[]
  }
}

async function stripeFetch<T>(
  apiKey: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const response = await fetch(`https://api.stripe.com${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${apiKey}`,
      ...(init?.headers ?? {}),
    },
  })
  if (!response.ok) {
    return { ok: false, status: response.status }
  }
  return { ok: true, data: (await response.json()) as T }
}

export async function fetchStripeAccount(apiKey: string) {
  return stripeFetch<StripeAccount>(apiKey, "/v1/account")
}

export async function listStripeSubscriptions(
  apiKey: string,
  startingAfter?: string
) {
  const params = new URLSearchParams({
    limit: "100",
    status: "all",
    "expand[]": "data.customer",
  })
  if (startingAfter) params.set("starting_after", startingAfter)
  return stripeFetch<StripeList<StripeSubscription>>(
    apiKey,
    `/v1/subscriptions?${params.toString()}`
  )
}

export async function retrieveStripeSubscription(
  apiKey: string,
  subscriptionId: string
) {
  const params = new URLSearchParams({
    "expand[]": "customer",
  })
  return stripeFetch<StripeSubscription>(
    apiKey,
    `/v1/subscriptions/${encodeURIComponent(subscriptionId)}?${params.toString()}`
  )
}

export async function retrieveStripeCustomer(
  apiKey: string,
  customerId: string
) {
  return stripeFetch<StripeCustomer>(
    apiKey,
    `/v1/customers/${encodeURIComponent(customerId)}`
  )
}

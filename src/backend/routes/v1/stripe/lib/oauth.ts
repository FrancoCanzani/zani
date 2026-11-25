import { hmacSha256Hex, timingSafeEqual } from "../../../../lib/secrets"
import type { AppEnv } from "../../../../types"

type Bindings = AppEnv["Bindings"]

const stateTtlMs = 10 * 60 * 1000
const oauthHintPrefix = "oauth:"

export type OauthState = {
  slug: string
  siteId: string
  userId: string
  exp: number
}

export function oauthConfig(env: Bindings) {
  const clientId = env.STRIPE_CLIENT_ID?.trim()
  const secretKey = env.STRIPE_SECRET_KEY?.trim()
  return clientId && secretKey ? { clientId, secretKey } : null
}

export function oauthRedirectUri(requestUrl: string) {
  return new URL("/api/v1/stripe-oauth/callback", requestUrl).toString()
}

function encode(value: string) {
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

function decode(value: string) {
  return atob(value.replace(/-/g, "+").replace(/_/g, "/"))
}

export async function signState(
  secret: string,
  input: Omit<OauthState, "exp">
) {
  const payload = encode(
    JSON.stringify({ ...input, exp: Date.now() + stateTtlMs })
  )
  return `${payload}.${await hmacSha256Hex(secret, `stripe-oauth:${payload}`)}`
}

export async function readState(
  secret: string,
  token: string
): Promise<OauthState | null> {
  const [payload, signature] = token.split(".")
  if (!payload || !signature) return null
  const expected = await hmacSha256Hex(secret, `stripe-oauth:${payload}`)
  if (!timingSafeEqual(signature, expected)) return null
  try {
    const state = JSON.parse(decode(payload)) as OauthState
    if (typeof state.exp !== "number" || state.exp < Date.now()) return null
    return state
  } catch {
    return null
  }
}

export function authorizeUrl(input: {
  clientId: string
  redirectUri: string
  state: string
}) {
  const url = new URL("https://connect.stripe.com/oauth/authorize")
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", input.clientId)
  url.searchParams.set("scope", "read_only")
  url.searchParams.set("redirect_uri", input.redirectUri)
  url.searchParams.set("state", input.state)
  return url.toString()
}

// The connection table has no account column, so OAuth connections keep the account id in the key hint.
export function oauthHint(accountId: string) {
  return `${oauthHintPrefix}${accountId}`
}

export function oauthAccount(hint: string) {
  return hint.startsWith(oauthHintPrefix)
    ? hint.slice(oauthHintPrefix.length)
    : null
}

export async function deauthorize(env: Bindings, accountId: string) {
  const config = oauthConfig(env)
  if (!config) return
  await fetch("https://connect.stripe.com/oauth/deauthorize", {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.secretKey}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      stripe_user_id: accountId,
    }),
  }).catch(() => null)
}

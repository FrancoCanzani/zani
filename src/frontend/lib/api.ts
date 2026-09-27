import { notFound, redirect } from "@tanstack/react-router"
import { hc } from "hono/client"

import type { V1Api } from "@backend/api"
import { API_BASE_PATH } from "@shared/api"

export const api = hc<V1Api>(API_BASE_PATH, {
  init: {
    credentials: "include",
  },
})

export async function requireJson<T extends Record<string, unknown>>(
  response: { ok: boolean; status: number; json: () => Promise<unknown> },
  key: keyof T & string
): Promise<T> {
  if (response.status === 401) {
    throw redirect({ to: "/sign-in" })
  }
  if (response.status === 404) {
    throw notFound()
  }
  if (!response.ok) {
    throw new Error("Request failed")
  }
  const body = await response.json()
  if (!body || typeof body !== "object" || !(key in body)) {
    throw new Error("Request failed")
  }
  return body as T
}

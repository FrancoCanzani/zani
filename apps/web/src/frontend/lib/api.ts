import { hc } from "hono/client"

import type { V1Api } from "@backend/api"
import { API_BASE_PATH } from "@shared/api"

export const api = hc<V1Api>(API_BASE_PATH, {
  init: {
    credentials: "include",
  },
})

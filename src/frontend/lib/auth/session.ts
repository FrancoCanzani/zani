import { queryOptions } from "@tanstack/react-query"

import { authClient } from "./client"

export const sessionQueryOptions = queryOptions({
  queryKey: ["session"] as const,
  queryFn: async () => {
    const { data } = await authClient.getSession()
    return data
  },
})

import type { QueryClient } from "@tanstack/react-query"

import type { authClient } from "./auth-client"

export type Session = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>

export type RouterContext = {
  queryClient: QueryClient
  session: Session | null
}

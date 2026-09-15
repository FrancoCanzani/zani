import type { authClient } from "./client"

export type Session = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>

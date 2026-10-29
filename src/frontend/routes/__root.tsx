import type { QueryClient } from "@tanstack/react-query"
import { createRootRouteWithContext } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"
import { RootLayout } from "@components/root-layout"
import { authClient } from "@lib/auth/client"

import "@/globals.css"

type Session = NonNullable<
  Awaited<ReturnType<typeof authClient.getSession>>["data"]
>

export type RouterContext = {
  queryClient: QueryClient
  session: Session | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    return { session }
  },
  pendingComponent: pendingScreen("Loading…"),
  notFoundComponent: NotFoundScreen,
  component: RootLayout,
})

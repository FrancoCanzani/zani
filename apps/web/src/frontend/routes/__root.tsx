import type { QueryClient } from "@tanstack/react-query"
import { Outlet, createRootRouteWithContext } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { PendingScreen } from "@components/pending-screen"
import { ThemeProvider } from "@components/theme-provider"
import { authClient } from "@lib/auth/client"
import type { Session } from "@lib/auth/session"

import "@workspace/ui/globals.css"

export type RouterContext = {
  queryClient: QueryClient
  session: Session | null
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const { data: session } = await authClient.getSession()
    return { session }
  },
  pendingComponent: () => <PendingScreen label="Loading…" />,
  notFoundComponent: NotFoundScreen,
  component: RootComponent,
})

function RootComponent() {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  )
}

import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { customersQueryOptions } from "@features/customers/api"
import { CustomersPage } from "@features/customers/customers-page"

export const Route = createFileRoute("/_authed/businesses/$slug/customers/")({
  pendingComponent: pendingScreen("Loading customers…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await context.queryClient.query({
      ...customersQueryOptions(params.slug),
      staleTime: "static",
    })
  },
  component: CustomersPage,
})

import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { customersQueryOptions } from "@features/customers/api"
import { invoicesQueryOptions } from "@features/invoices/api"
import { InvoicesPage } from "@features/invoices/invoices-page"

export const Route = createFileRoute("/_authed/businesses/$slug/")({
  pendingComponent: pendingScreen("Loading invoices…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query({
        ...invoicesQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...customersQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])
  },
  component: InvoicesPage,
})

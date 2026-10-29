import { createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"
import { pendingScreen } from "@components/pending-screen"

import { customersQueryOptions } from "@features/customers/api"
import { invoiceQueryOptions } from "@features/invoices/api"
import { InvoiceBuilderPage } from "@features/invoices/invoice-builder-page"
import { productsQueryOptions } from "@features/products/api"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/invoices/$invoiceId"
)({
  pendingComponent: pendingScreen("Loading invoice…"),
  notFoundComponent: NotFoundScreen,
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.query({
        ...invoiceQueryOptions(params.slug, params.invoiceId),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...customersQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...productsQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])
  },
  component: InvoiceBuilderPage,
})

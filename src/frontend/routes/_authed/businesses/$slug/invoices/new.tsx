import { createFileRoute, redirect } from "@tanstack/react-router"
import { toast } from "sonner"

import { pendingScreen } from "@components/pending-screen"

import { customersQueryOptions } from "@features/customers/api"
import { createInvoice, invoiceQueryOptions } from "@features/invoices/api"
import { productsQueryOptions } from "@features/products/api"

export const Route = createFileRoute("/_authed/businesses/$slug/invoices/new")({
  pendingComponent: pendingScreen("Loading…"),
  loader: async ({ context, params, preload }) => {
    // Loading this route creates a draft, so hover preloads must not run it.
    if (preload) return

    const [created] = await Promise.allSettled([
      createInvoice(params.slug),
      context.queryClient.query({
        ...customersQueryOptions(params.slug),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...productsQueryOptions(params.slug),
        staleTime: "static",
      }),
    ])

    if (created.status === "rejected") {
      toast.error(
        created.reason instanceof Error
          ? created.reason.message
          : "Could not create the invoice."
      )
      throw redirect({ to: "/businesses/$slug", params: { slug: params.slug } })
    }

    const { invoice } = created.value
    context.queryClient.setQueryData(
      invoiceQueryOptions(params.slug, invoice.id).queryKey,
      created.value
    )
    void context.queryClient.invalidateQueries({
      queryKey: ["invoices", params.slug],
    })
    throw redirect({
      to: "/businesses/$slug/invoices/$invoiceId",
      params: { slug: params.slug, invoiceId: invoice.id },
      replace: true,
    })
  },
})

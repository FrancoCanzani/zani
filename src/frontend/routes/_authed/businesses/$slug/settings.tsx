import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/businesses/$slug/settings")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/businesses/$slug/manage",
      params: { slug: params.slug },
    })
  },
})

import { Outlet, createFileRoute } from "@tanstack/react-router"

import { NotFoundScreen } from "@components/not-found-screen"

export const Route = createFileRoute(
  "/_authed/businesses/$slug/_shell/sites/$siteId"
)({
  notFoundComponent: NotFoundScreen,
  component: Outlet,
})

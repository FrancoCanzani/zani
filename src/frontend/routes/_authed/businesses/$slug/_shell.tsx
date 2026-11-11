import { Outlet, createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_authed/businesses/$slug/_shell")({
  component: Outlet,
})

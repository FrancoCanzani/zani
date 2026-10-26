import { createFileRoute } from "@tanstack/react-router"

import { CompleteNamePage } from "@features/auth/complete-name-page"

export const Route = createFileRoute("/_authed/welcome")({
  component: CompleteNamePage,
})

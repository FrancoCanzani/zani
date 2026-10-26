import { createFileRoute } from "@tanstack/react-router"

import { NewBusinessPage } from "@features/businesses/new-business-page"

export const Route = createFileRoute("/_authed/businesses/new")({
  component: NewBusinessPage,
})

import { createFileRoute, redirect } from "@tanstack/react-router"

import { GuestHome } from "@features/home/guest-home"
import { needsDisplayName } from "@lib/auth/profile"

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (!context.session) {
      return
    }

    if (needsDisplayName(context.session.user)) {
      throw redirect({ to: "/welcome" })
    }

    throw redirect({ to: "/businesses" })
  },
  component: GuestHome,
})

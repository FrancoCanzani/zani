import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

import { needsDisplayName } from "@lib/auth/profile"

export const Route = createFileRoute("/_authed")({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({
        to: "/sign-in",
        search: {
          redirect: `${location.pathname}${location.search}`,
        },
      })
    }

    const onWelcome = location.pathname === "/welcome"
    if (needsDisplayName(context.session.user)) {
      if (!onWelcome) {
        throw redirect({ to: "/welcome" })
      }
    } else if (onWelcome) {
      throw redirect({ to: "/dashboard" })
    }

    return { session: context.session }
  },
  component: Outlet,
})

import { Outlet, createFileRoute, redirect } from "@tanstack/react-router"

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
    return { session: context.session }
  },
  component: AuthedLayout,
})

function AuthedLayout() {
  return <Outlet />
}

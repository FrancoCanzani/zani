import { Outlet, getRouteApi, useRouterState } from "@tanstack/react-router"

import { BrandMark } from "@components/brand-mark"

import { UserMenu } from "@features/account/user-menu"

const routeApi = getRouteApi("/_authed")

export function AppShell() {
  const { session } = routeApi.useRouteContext()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const bare =
    !session || pathname === "/welcome" || pathname.startsWith("/invites/")

  if (bare) {
    return <Outlet />
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-20 h-14 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-full w-full max-w-6xl items-center gap-6 px-4 sm:px-6">
          <BrandMark to="/businesses" className="text-3xl" />
          <div className="ml-auto">
            <UserMenu name={session.user.name} email={session.user.email} />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-8 pb-24 sm:px-6">
        <Outlet />
      </main>
    </div>
  )
}

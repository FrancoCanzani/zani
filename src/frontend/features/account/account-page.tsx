import { Link, getRouteApi } from "@tanstack/react-router"

import { BrandMark } from "@components/brand-mark"

import { AccountSettings } from "@features/account/account-settings"
import { UserMenu } from "@features/account/user-menu"

const routeApi = getRouteApi("/_authed/account")

export function AccountPage() {
  const { session } = routeApi.useRouteContext()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-lg flex-col px-6 py-10">
      <header className="flex items-center justify-between gap-4">
        <BrandMark to="/businesses" />
        <UserMenu name={session.user.name} email={session.user.email} />
      </header>

      <div className="mt-16 flex flex-1 flex-col gap-8">
        <div className="space-y-2">
          <Link
            to="/businesses"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Back
          </Link>
          <h1 className="text-2xl tracking-tight sm:text-3xl">Settings</h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Your name and sign-in email.
          </p>
        </div>
        <AccountSettings name={session.user.name} email={session.user.email} />
      </div>
    </main>
  )
}

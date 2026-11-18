import { getRouteApi } from "@tanstack/react-router"

import { AccountSettings } from "@features/account/account-settings"
import { ShellTopBar } from "@features/app/shell-top-bar"

const routeApi = getRouteApi("/_authed/account")

export function AccountPage() {
  const { session } = routeApi.useRouteContext()

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <ShellTopBar />
      <div className="space-y-2">
        <h1 className="text-3xl font-light tracking-tight sm:text-4xl">
          Settings
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Your name and sign-in email.
        </p>
      </div>
      <AccountSettings name={session.user.name} email={session.user.email} />
    </div>
  )
}

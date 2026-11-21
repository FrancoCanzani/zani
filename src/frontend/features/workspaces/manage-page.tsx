import { getRouteApi } from "@tanstack/react-router"

import { PeoplePanel } from "@features/workspaces/people-panel"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/manage")
const sessionApi = getRouteApi("/_authed")

export function ManagePage() {
  const { slug } = routeApi.useParams()
  const { session } = sessionApi.useRouteContext()

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
      <div className="space-y-1">
        <h1 className="text-4xl font-light tracking-tight">Manage</h1>
        <p className="text-sm text-muted-foreground">People and invites.</p>
      </div>
      <PeoplePanel slug={slug} email={session.user.email} />
    </div>
  )
}

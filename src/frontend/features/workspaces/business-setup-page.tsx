import { useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi, useNavigate } from "@tanstack/react-router"

import { BusinessDetailsFields } from "@features/workspaces/business-details-fields"
import { workspaceQueryOptions } from "@features/workspaces/api"

const routeApi = getRouteApi("/_authed/businesses/$slug/setup")

export function BusinessSetupPage() {
  const { slug } = routeApi.useParams()
  const navigate = useNavigate()
  const { data } = useSuspenseQuery(workspaceQueryOptions(slug))

  function finish() {
    void navigate({ to: "/businesses/$slug", params: { slug } })
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-8">
      <div className="space-y-1">
        <h1 className="text-2xl tracking-tight">Business details</h1>
        <p className="text-sm text-muted-foreground">
          This shows on invoices you send. You can skip and finish it later in
          Manage.
        </p>
      </div>
      <BusinessDetailsFields
        slug={slug}
        workspace={data.workspace}
        showSkip
        submitLabel="Continue"
        onSaved={finish}
        onSkipped={finish}
      />
    </div>
  )
}

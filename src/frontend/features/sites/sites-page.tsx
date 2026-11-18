import { useForm } from "@tanstack/react-form"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { useState } from "react"
import { z } from "zod"

import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"

import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"
import { workspaceQueryOptions } from "@features/workspaces/api"
import { fieldErrors } from "@lib/utils"

import { createSite, sitesQueryOptions } from "./api"

const routeApi = getRouteApi("/_authed/businesses/$slug/_shell/")

const siteSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80),
  domain: z.string().trim().min(1, "Enter a domain.").max(253),
})

export function SitesPage() {
  const { slug } = routeApi.useParams()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(sitesQueryOptions(slug))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canAdd = role ? canManageBusiness(role) : false
  const [created, setCreated] = useState<{
    name: string
    writeKey: string
  } | null>(null)

  const form = useForm({
    defaultValues: { name: "", domain: "" },
    validators: { onSubmit: siteSchema },
    onSubmit: async ({ value, formApi }) => {
      const result = await createSite(slug, {
        name: value.name.trim(),
        domain: value.domain.trim(),
      })
      setCreated({ name: result.site.name, writeKey: result.writeKey })
      formApi.reset()
      await queryClient.invalidateQueries({ queryKey: ["sites", slug] })
    },
  })

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-4xl font-light tracking-tight">Sites</h1>

      <ul className="divide-y border-y">
        {data.sites.map((site) => (
          <li key={site.id} className="py-3">
            <Link
              to="/businesses/$slug/sites/$siteId"
              params={{ slug, siteId: site.id }}
              className="flex items-baseline justify-between gap-4"
            >
              <span>{site.name}</span>
              <span className="text-sm text-muted-foreground">
                {site.domain}
                {site.revokedAt ? " revoked" : ""}
              </span>
            </Link>
          </li>
        ))}
        {data.sites.length === 0 ? (
          <li className="py-3 text-sm text-muted-foreground">No sites.</li>
        ) : null}
      </ul>

      {created ? (
        <InstallSnippet
          label={`${created.name} write key`}
          writeKey={created.writeKey}
          note="Shown once."
        />
      ) : null}

      {canAdd ? (
        <form
          className="max-w-sm space-y-3"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                  />
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
            <form.Field name="domain">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Domain</FieldLabel>
                  <Input
                    id={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="example.com"
                  />
                  <FieldError errors={fieldErrors(field.state.meta.errors)} />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <form.Subscribe selector={(state) => state.isSubmitting}>
            {(isSubmitting) => (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding…" : "Add site"}
              </Button>
            )}
          </form.Subscribe>
        </form>
      ) : null}
    </div>
  )
}

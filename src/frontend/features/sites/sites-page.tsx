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
import { rememberWriteKey } from "./write-key"

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
    id: string
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
      rememberWriteKey(result.site.id, result.writeKey)
      setCreated({
        id: result.site.id,
        name: result.site.name,
        writeKey: result.writeKey,
      })
      formApi.reset()
      await queryClient.invalidateQueries({ queryKey: ["sites", slug] })
    },
  })

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-4xl font-light tracking-tight">Sites</h1>

      <ul className="divide-y overflow-hidden rounded-xl border border-border/70 bg-card">
        {data.sites.map((site) => (
          <li key={site.id}>
            <Link
              to="/businesses/$slug/sites/$siteId"
              params={{ slug, siteId: site.id }}
              className="flex min-w-0 items-baseline justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <span className="min-w-0 truncate">{site.name}</span>
              <span className="flex shrink-0 items-baseline gap-3 text-sm text-muted-foreground">
                <span>{site.domain}</span>
                {site.revokedAt ? <span>Stopped</span> : null}
              </span>
            </Link>
          </li>
        ))}
        {data.sites.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            No sites yet.
          </li>
        ) : null}
      </ul>

      {created ? (
        <section className="space-y-4 rounded-xl border border-border/70 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold tracking-tight">
              {created.name} is ready
            </p>
            <Button asChild size="sm">
              <Link
                to="/businesses/$slug/sites/$siteId"
                params={{ slug, siteId: created.id }}
              >
                Open dashboard
              </Link>
            </Button>
          </div>
          <InstallSnippet
            label="Write key"
            writeKey={created.writeKey}
            note="Shown once."
          />
        </section>
      ) : null}

      {canAdd ? (
        <form
          className="max-w-md space-y-4 rounded-xl border border-border/70 bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault()
            event.stopPropagation()
            void form.handleSubmit()
          }}
        >
          <h2 className="text-[15px] font-semibold tracking-tight">
            Add a site
          </h2>
          <FieldGroup>
            <form.Field name="name">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    autoComplete="off"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="My SaaS…"
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
                    name={field.name}
                    autoComplete="off"
                    spellCheck={false}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    placeholder="example.com…"
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

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { BrandMark } from "@components/brand-mark"
import { InstallSnippet } from "@components/install-snippet"
import { Button } from "@components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"

import { createSite } from "@features/sites/api"
import {
  readLastWorkspaceSlug,
  writeLastWorkspaceSlug,
} from "@features/workspaces/last-workspace"
import { api, requireJson } from "@lib/api"
import { fieldErrors } from "@lib/utils"

const siteSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80),
  domain: z.string().trim().min(1, "Enter a domain.").max(253),
})

type CreatedSite = {
  slug: string
  siteId: string
  name: string
  writeKey: string
}

export function NewBusinessPage() {
  const queryClient = useQueryClient()
  const [created, setCreated] = useState<CreatedSite | null>(null)

  const addSite = useMutation({
    mutationFn: async (value: { name: string; domain: string }) => {
      const listed = await requireJson<{
        workspaces: Array<{ slug: string }>
      }>(await api.workspaces.$get(), "workspaces")
      const last = readLastWorkspaceSlug()
      const existing =
        listed.workspaces.find((item) => item.slug === last) ??
        listed.workspaces[0]
      let slug = existing?.slug

      if (!slug) {
        const response = await api.workspaces.$post({
          json: { name: value.name },
        })
        if (!response.ok) {
          throw new Error("Could not add the site.")
        }
        const body = await requireJson<{ workspace: { slug: string } }>(
          response,
          "workspace"
        )
        slug = body.workspace.slug
      }

      const result = await createSite(slug, value)
      writeLastWorkspaceSlug(slug)
      return {
        slug,
        siteId: result.site.id,
        name: result.site.name,
        writeKey: result.writeKey,
      }
    },
    onSuccess: async (result) => {
      setCreated(result)
      await queryClient.invalidateQueries({ queryKey: ["workspaces"] })
      await queryClient.invalidateQueries({ queryKey: ["account-sites"] })
      await queryClient.invalidateQueries({ queryKey: ["sites", result.slug] })
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const form = useForm({
    defaultValues: {
      name: "",
      domain: "",
    },
    validators: {
      onSubmit: siteSchema,
    },
    onSubmit: async ({ value }) => {
      await addSite.mutateAsync({
        name: value.name.trim(),
        domain: value.domain.trim(),
      })
    },
  })

  return (
    <div className="flex min-h-svh flex-col">
      <header className="px-5">
        <div className="mx-auto flex h-12 w-full max-w-5xl items-center">
          <BrandMark to="/businesses" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-10">
        <Link
          to="/businesses"
          className="mb-4 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </Link>
        <h1 className="text-2xl font-light tracking-tight sm:text-4xl">
          Add a site
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The domain is the hostname visitors use.
        </p>

        {created ? (
          <div className="mt-8 space-y-6">
            <InstallSnippet
              label={`${created.name} write key`}
              writeKey={created.writeKey}
              note="Shown once."
            />
            <Button asChild>
              <Link
                to="/businesses/$slug/sites/$siteId"
                params={{ slug: created.slug, siteId: created.siteId }}
              >
                Open site
              </Link>
            </Button>
          </div>
        ) : (
          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              addSite.reset()
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
                      name={field.name}
                      autoFocus
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
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
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="example.com"
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
              <form.Subscribe selector={(state) => state.isSubmitting}>
                {(isSubmitting) => (
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Adding…" : "Add site"}
                  </Button>
                )}
              </form.Subscribe>
            </FieldGroup>
          </form>
        )}
      </main>
    </div>
  )
}

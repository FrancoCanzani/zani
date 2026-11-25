import { useForm } from "@tanstack/react-form"
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
  type QueryClient,
} from "@tanstack/react-query"
import { Link, getRouteApi, notFound } from "@tanstack/react-router"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { z } from "zod"

import { InstallSnippet } from "@components/install-snippet"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@components/ui/alert-dialog"
import { Button } from "@components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "@components/ui/field"
import { Input } from "@components/ui/input"

import { RevenueSettings } from "@features/revenue/revenue-settings"
import { workspaceQueryOptions } from "@features/workspaces/api"
import { PeoplePanel } from "@features/workspaces/people-panel"
import {
  canManageBusiness,
  parseWorkspaceRole,
} from "@features/workspaces/role"
import { fieldErrors } from "@lib/utils"

import {
  replaceWriteKey,
  revokeSite,
  sitesQueryOptions,
  updateSite,
} from "./api"
import { useRememberedWriteKey } from "./write-key"

const routeApi = getRouteApi(
  "/_authed/businesses/$slug/_shell/sites/$siteId/settings"
)
const sessionApi = getRouteApi("/_authed")

const hostnamePattern =
  /^(?=.{1,253}$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "")
}

const detailsSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(80),
  domain: z
    .string()
    .trim()
    .min(1, "Enter a domain.")
    .refine(
      (value) => hostnamePattern.test(normalizeDomain(value)),
      "Enter a domain like example.com."
    ),
})

async function refreshSite(
  queryClient: QueryClient,
  slug: string,
  siteId: string
) {
  await queryClient.invalidateQueries({ queryKey: ["sites", slug] })
  await queryClient.invalidateQueries({ queryKey: ["account-sites"] })
  await queryClient.invalidateQueries({
    queryKey: ["site-stats", slug, siteId],
  })
}

export function SiteSettingsPage() {
  const { slug, siteId } = routeApi.useParams()
  const { session } = sessionApi.useRouteContext()
  const queryClient = useQueryClient()
  const { data } = useSuspenseQuery(sitesQueryOptions(slug))
  const { data: workspaceData } = useSuspenseQuery(workspaceQueryOptions(slug))
  const site = data.sites.find((item) => item.id === siteId)
  if (!site) throw notFound()

  const role = parseWorkspaceRole(workspaceData.workspace.role)
  const canManage = role ? canManageBusiness(role) : false
  const { writeKey, setWriteKey } = useRememberedWriteKey(siteId)
  const [writeKeyNote, setWriteKeyNote] = useState("Shown once.")
  const [rotateOpen, setRotateOpen] = useState(false)
  const [revokeOpen, setRevokeOpen] = useState(false)

  const save = useMutation({
    mutationFn: (body: { name?: string; domain?: string }) =>
      updateSite(slug, siteId, body),
    onSuccess: async () => {
      await refreshSite(queryClient, slug, siteId)
      toast.success("Site saved.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const rotate = useMutation({
    mutationFn: () => replaceWriteKey(slug, siteId),
    onSuccess: (result) => {
      setWriteKey(result.writeKey)
      setWriteKeyNote("Shown once. The previous key no longer works.")
      setRotateOpen(false)
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const revoke = useMutation({
    mutationFn: () => revokeSite(slug, siteId),
    onSuccess: async () => {
      setRevokeOpen(false)
      await refreshSite(queryClient, slug, siteId)
      toast.success("Site revoked.")
    },
    onError: (error) => {
      toast.error(error.message)
    },
  })

  const form = useForm({
    defaultValues: {
      name: site.name,
      domain: site.domain,
    },
    validators: {
      onSubmit: detailsSchema,
    },
    onSubmit: async ({ value, formApi }) => {
      const name = value.name.trim()
      const domain = normalizeDomain(value.domain)
      const body: { name?: string; domain?: string } = {}
      if (name !== site.name) body.name = name
      if (domain !== site.domain) body.domain = domain
      if (!body.name && !body.domain) return
      await save.mutateAsync(body)
      formApi.setFieldValue("name", name)
      formApi.setFieldValue("domain", domain)
    },
  })

  useEffect(() => {
    form.reset({ name: site.name, domain: site.domain })
  }, [form, site.domain, site.id, site.name])

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-10">
      <div className="space-y-4">
        <Link
          to="/businesses/$slug/sites/$siteId"
          params={{ slug, siteId }}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Back
        </Link>
        <div className="space-y-1">
          <h1 className="text-4xl font-light tracking-tight">Settings</h1>
          <p className="truncate text-sm text-muted-foreground">{site.name}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm text-muted-foreground">Details</h2>
        {canManage ? (
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              event.stopPropagation()
              save.reset()
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
                      autoComplete="off"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      maxLength={80}
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
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      placeholder="example.com…"
                      maxLength={253}
                    />
                    <FieldError errors={fieldErrors(field.state.meta.errors)} />
                  </Field>
                )}
              </form.Field>
            </FieldGroup>
            <form.Subscribe
              selector={(state) => [state.isSubmitting, state.values]}
            >
              {([isSubmitting, values]) => {
                const current = values as { name: string; domain: string }
                const unchanged =
                  current.name.trim() === site.name &&
                  normalizeDomain(current.domain) === site.domain
                return (
                  <Button
                    type="submit"
                    disabled={Boolean(isSubmitting) || unchanged}
                  >
                    {isSubmitting ? "Saving…" : "Save"}
                  </Button>
                )
              }}
            </form.Subscribe>
          </form>
        ) : (
          <dl className="space-y-3">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="truncate">{site.name}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Domain</dt>
              <dd className="truncate">{site.domain}</dd>
            </div>
          </dl>
        )}
      </section>

      {canManage ? (
        <section id="install" className="scroll-mt-24 space-y-3">
          <h2 className="text-sm text-muted-foreground">Install</h2>
          {site.revokedAt !== null ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Collection is stopped, so the script no longer records pageviews.
            </p>
          ) : (
            <>
              {writeKey ? (
                <InstallSnippet
                  label="Write key"
                  writeKey={writeKey}
                  note={writeKeyNote}
                />
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The write key is shown once, when you add the site or rotate
                  it.
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={rotate.isPending}
                onClick={() => {
                  rotate.reset()
                  setRotateOpen(true)
                }}
              >
                Rotate key
              </Button>
            </>
          )}
        </section>
      ) : null}

      <RevenueSettings slug={slug} siteId={siteId} canManage={canManage} />

      <PeoplePanel slug={slug} email={session.user.email} />

      {canManage ? (
        <section className="space-y-3 border-t pt-8">
          <h2 className="text-sm text-muted-foreground">Danger</h2>
          {site.revokedAt !== null ? (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Collection is stopped. New pageviews are not recorded.
            </p>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Stop recording pageviews for this domain. Existing stats stay
                available.
              </p>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  revoke.reset()
                  setRevokeOpen(true)
                }}
              >
                Revoke site
              </Button>
            </>
          )}
        </section>
      ) : null}

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate the write key?</AlertDialogTitle>
            <AlertDialogDescription>
              The current key stops working. Paste the new script on the site.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rotate.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={rotate.isPending}
              onClick={() => {
                void rotate.mutate()
              }}
            >
              {rotate.isPending ? "Rotating…" : "Rotate key"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={revokeOpen} onOpenChange={setRevokeOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this site?</AlertDialogTitle>
            <AlertDialogDescription>
              New pageviews stop. Stats already collected stay available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={revoke.isPending}
              onClick={() => {
                void revoke.mutate()
              }}
            >
              {revoke.isPending ? "Revoking…" : "Revoke site"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

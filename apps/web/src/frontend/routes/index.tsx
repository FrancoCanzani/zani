import { Link, createFileRoute, redirect } from "@tanstack/react-router"

import { SombraGradient } from "@components/sombra-gradient"
import { readLastWorkspaceSlug } from "@features/workspaces/last-workspace"
import { workspacesQueryOptions } from "@features/workspaces/api"

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (!context.session) {
      return
    }

    const { workspaces } = await context.queryClient.query({
      ...workspacesQueryOptions(),
      staleTime: "static",
    })

    if (workspaces.length === 0) {
      throw redirect({ to: "/onboarding" })
    }

    const lastSlug = readLastWorkspaceSlug()
    const selected =
      workspaces.find((item) => item.slug === lastSlug) ?? workspaces[0]

    if (!selected) {
      throw redirect({ to: "/onboarding" })
    }

    throw redirect({
      to: "/w/$slug",
      params: { slug: selected.slug },
    })
  },
  component: GuestHome,
})

function GuestHome() {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-4xl flex-col bg-white px-6 font-lato text-neutral-950">
      <header className="flex justify-end pt-8">
        <Link
          to="/sign-in"
          className="text-sm text-neutral-500 transition-colors hover:text-neutral-950"
        >
          Sign in
        </Link>
      </header>

      <section className="flex flex-1 flex-col justify-center pb-16 pt-10">
        <p className="text-[clamp(3.5rem,12vw,6.5rem)] leading-[0.95] font-bold tracking-tight">
          Link
        </p>
        <h1 className="mt-8 max-w-lg text-2xl leading-snug font-normal tracking-tight sm:text-3xl">
          Short links your team actually owns.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-neutral-500">
          Create a workspace, invite people, and ship links that stay with you —
          not a shared dump of random URLs.
        </p>
        <Link
          to="/sign-in"
          className="mt-10 inline-flex w-fit items-center bg-neutral-950 px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-80"
        >
          Get started
        </Link>
      </section>

      <div
        aria-hidden
        className="pointer-events-none relative h-28 w-full shrink-0 overflow-hidden sm:h-36"
      >
        <div className="absolute inset-x-0 bottom-0 h-52 sm:h-64">
          <SombraGradient />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white/50 to-transparent" />
      </div>
    </main>
  )
}

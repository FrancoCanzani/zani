import { Link, createFileRoute, redirect } from "@tanstack/react-router"

import { AppShell } from "@components/app-shell"
import { workspacesQueryOptions } from "@features/workspaces/api"
import { readLastWorkspaceSlug } from "@features/workspaces/last-workspace"

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
    <AppShell
      nav={
        <>
          <a href="#about" className="transition-colors hover:text-foreground">
            About
          </a>
          <Link
            to="/sign-in"
            className="transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </>
      }
    >
      <main>
        <section className="flex flex-col gap-7 py-32">
          <p className="text-muted-foreground italic">
            For teams that ship fast.
          </p>
          <h1 className="max-w-xl text-2xl font-normal tracking-tight sm:text-3xl">
            Your link manager when you want something simpler.
          </h1>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              to="/sign-in"
              className="group flex cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-800 px-4 py-1 text-base text-white shadow-sm transition-all duration-300"
            >
              Get started
            </Link>
            <a
              href="#about"
              className="group flex cursor-pointer items-center justify-center gap-2 rounded-md border bg-white px-4 py-1 text-base shadow-sm transition-all duration-300"
            >
              Read our docs
            </a>
          </div>
        </section>

        <section id="about" className="space-y-12 pb-32">
          <div className="space-y-4">
            <h2 className="text-xl font-normal text-muted-foreground">
              So, what is this?
            </h2>
            <p className="max-w-xl leading-relaxed">
              Zani Links is a simple place to create and share short links.
              Workspaces for your team, readable codes, destinations you control
              — without the weight of a full marketing suite.
            </p>
            <p className="max-w-xl leading-relaxed">
              Invite people, keep links organized, and see basic click data when
              you need it. That’s it.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-normal text-muted-foreground">
              How it works
            </h2>
            <ul className="max-w-xl space-y-3 leading-relaxed">
              <li>
                <span className="font-medium">Workspace first.</span> Sign in,
                name a workspace, invite the people who need access.
              </li>
              <li>
                <span className="font-medium">Links you own.</span> Short codes
                and destinations live under{" "}
                <code className="font-mono text-sm">/w/$slug</code>, not a
                personal free-for-all.
              </li>
              <li>
                <span className="font-medium">Campaigns later.</span> Group
                links by launch, keep UTMs consistent, report in one place.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-normal text-muted-foreground">
              Get in
            </h2>
            <p className="max-w-xl leading-relaxed">
              Email OTP. No password. Create a workspace and start linking.
            </p>
            <Link
              to="/sign-in"
              className="group inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-neutral-900 bg-neutral-800 px-4 py-1 text-base text-white shadow-sm transition-all duration-300"
            >
              Sign in
            </Link>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

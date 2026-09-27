import { Link } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

export function GuestHome() {
  return (
    <div className="relative min-h-svh">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-10 h-32 bg-background/70 backdrop-blur-xl"
        style={{
          maskImage:
            "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.9) 35%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.9) 35%, transparent 100%)",
        }}
      />

      <div className="mx-auto w-full max-w-2xl px-6 sm:px-8">
        <header className="sticky top-0 z-20 flex items-center justify-between py-7">
          <Link to="/" className="text-2xl tracking-tight">
            Zani Links
          </Link>
          <nav className="flex items-center gap-6 text-muted-foreground">
            <a
              href="#about"
              className="transition-colors hover:text-foreground"
            >
              About
            </a>
            <Link
              to="/sign-in"
              className="transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>
        </header>

        <main>
          <section className="flex flex-col gap-7 py-32">
            <p className="text-muted-foreground italic">
              For teams that ship fast.
            </p>
            <h1 className="max-w-xl text-2xl font-normal tracking-tight sm:text-3xl">
              Your link manager when you want something simpler.
            </h1>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                asChild
                className="border-neutral-900 bg-neutral-800 text-white shadow-sm hover:bg-neutral-800"
              >
                <Link to="/sign-in">Get started</Link>
              </Button>
              <Button asChild variant="outline" className="bg-white shadow-sm">
                <a href="#about">Read our docs</a>
              </Button>
            </div>
          </section>

          <section id="about" className="space-y-12 pb-32">
            <div className="space-y-4">
              <h2 className="text-xl font-normal text-muted-foreground">
                So, what is this?
              </h2>
              <p className="max-w-xl leading-relaxed">
                Zani Links is a simple place to create and share short links.
                Workspaces for your team, readable codes, destinations you
                control — without the weight of a full marketing suite.
              </p>
              <p className="max-w-xl leading-relaxed">
                Invite people, keep links organized, and see basic click data
                when you need it. That’s it.
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
                  <span className="font-medium">Links you own.</span> Short
                  codes and destinations live under{" "}
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
              <Button
                asChild
                className="border-neutral-900 bg-neutral-800 text-white shadow-sm hover:bg-neutral-800"
              >
                <Link to="/sign-in">Sign in</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

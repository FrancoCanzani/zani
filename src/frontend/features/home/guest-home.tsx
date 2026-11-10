import { Link } from "@tanstack/react-router"

import { BrandMark } from "@components/brand-mark"
import { Button } from "@components/ui/button"

export function GuestHome() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto w-full max-w-2xl px-6 sm:px-8">
        <header className="flex items-center justify-between py-7">
          <BrandMark className="text-2xl" />
          <Link
            to="/sign-in"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </header>

        <main>
          <section className="flex flex-col gap-6 py-28 sm:py-36">
            <h1 className="max-w-xl text-3xl font-light tracking-tight sm:text-4xl">
              Pageviews for a site you own.
            </h1>
            <p className="max-w-lg leading-relaxed text-muted-foreground">
              Sign in with email. No password.
            </p>
            <div className="pt-2">
              <Button asChild>
                <Link to="/sign-in">Get started</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

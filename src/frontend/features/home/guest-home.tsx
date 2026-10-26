import { Link } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

export function GuestHome() {
  return (
    <div className="min-h-svh">
      <div className="mx-auto w-full max-w-2xl px-6 sm:px-8">
        <header className="flex items-center justify-between py-7">
          <Link to="/" className="text-2xl tracking-tight">
            zani
          </Link>
          <Link
            to="/sign-in"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </header>

        <main>
          <section className="flex flex-col gap-6 py-28 sm:py-36">
            <p className="text-muted-foreground">
              For solo trades and tiny crews
            </p>
            <h1 className="max-w-xl text-3xl font-normal tracking-tight sm:text-4xl">
              Send estimates that customers actually accept and pay.
            </h1>
            <p className="max-w-lg text-muted-foreground leading-relaxed">
              Build a clean estimate on your phone, share a link, and take a
              deposit when they say yes. No PDFs. No chasing.
            </p>
            <div className="pt-2">
              <Button asChild>
                <Link to="/sign-in">Get started</Link>
              </Button>
            </div>
          </section>

          <section className="space-y-14 border-t border-border py-16 pb-28">
            <div className="space-y-3">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                How it works
              </h2>
              <ol className="max-w-lg space-y-4 leading-relaxed">
                <li>
                  <span className="font-medium">1. Build</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — a clear estimate in about a minute.
                  </span>
                </li>
                <li>
                  <span className="font-medium">2. Share</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — send the link over WhatsApp, text, or email.
                  </span>
                </li>
                <li>
                  <span className="font-medium">3. Get booked</span>
                  <span className="text-muted-foreground">
                    {" "}
                    — they accept and pay a deposit on the same page. Money
                    goes to you.
                  </span>
                </li>
              </ol>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
                Why a deposit
              </h2>
              <p className="max-w-lg leading-relaxed text-muted-foreground">
                A deposit books the date and covers materials. You are not
                locking up the full job price, and we are not holding your money
                in escrow. Just the moment that turns a maybe into a real job.
              </p>
            </div>

            <div className="space-y-4">
              <p className="max-w-lg leading-relaxed text-muted-foreground">
                Sign in with email. No password.
              </p>
              <Button asChild variant="outline">
                <Link to="/sign-in">Sign in</Link>
              </Button>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

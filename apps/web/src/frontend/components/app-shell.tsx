import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"

export function AppShell({
  children,
  nav,
}: {
  children: ReactNode
  nav?: ReactNode
}) {
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
          {nav ? (
            <nav className="flex items-center gap-6 text-muted-foreground">
              {nav}
            </nav>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  )
}

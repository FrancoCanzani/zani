import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useState } from "react"

import { Button } from "@components/ui/button"

import { siteSetupQueryOptions } from "./api"

function dismissedKey(siteId: string) {
  return `zani.setupDismissed.${siteId}`
}

function readDismissed(siteId: string) {
  try {
    return localStorage.getItem(dismissedKey(siteId)) === "1"
  } catch {
    return false
  }
}

export function SetupChecklist({
  slug,
  siteId,
  stripeConnected,
}: {
  slug: string
  siteId: string
  stripeConnected: boolean
}) {
  const { data } = useQuery(siteSetupQueryOptions(slug, siteId))
  const [dismissed, setDismissed] = useState(() => readDismissed(siteId))
  const identified = (data?.setup.signups ?? 0) > 0

  if (!data || dismissed || (stripeConnected && identified)) return null

  const steps = [
    { label: "Install the script", done: true, hash: "install" },
    { label: "Connect Stripe", done: stripeConnected, hash: "revenue" },
    { label: "Identify signups", done: identified, hash: "revenue" },
  ]

  return (
    <section className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-dashed border-border px-4 py-2.5 text-[13px]">
      <span className="font-medium">Finish setup</span>
      <ol className="flex flex-wrap items-center gap-x-5 gap-y-1">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-baseline gap-1.5">
            <span className="font-mono text-xs text-muted-foreground">
              {index + 1}
            </span>
            {step.done ? (
              <span className="text-muted-foreground line-through decoration-muted-foreground/50">
                {step.label}
              </span>
            ) : (
              <Link
                to="/businesses/$slug/sites/$siteId/settings"
                params={{ slug, siteId }}
                hash={step.hash}
                className="underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground"
              >
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <Button
        type="button"
        size="xs"
        variant="ghost"
        className="ml-auto text-muted-foreground"
        onClick={() => {
          try {
            localStorage.setItem(dismissedKey(siteId), "1")
          } catch {
            // Private mode can throw.
          }
          setDismissed(true)
        }}
      >
        Hide
      </Button>
    </section>
  )
}

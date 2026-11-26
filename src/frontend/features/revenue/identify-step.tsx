import { useState } from "react"

import { Segmented } from "@components/segmented"
import { CodeBlock, EmptyNote } from "@components/setup-step"

import type { SiteSetup } from "@features/sites/api"
import { formatRelative } from "@lib/utils"

type Framework = "javascript" | "react" | "next" | "vue" | "types"

const frameworks: readonly Framework[] = [
  "javascript",
  "react",
  "next",
  "vue",
  "types",
]

const frameworkLabels: Record<Framework, string> = {
  javascript: "JavaScript",
  react: "React",
  next: "Next.js",
  vue: "Vue",
  types: "TypeScript",
}

function identifySnippet(framework: Framework, origin: string) {
  switch (framework) {
    case "javascript":
      return `// After the signup request succeeds
zani.identify(user.id, { email: user.email })`
    case "react":
      return `async function onSubmit(values) {
  const user = await createAccount(values)
  window.zani?.identify(user.id, { email: user.email })
  navigate("/welcome")
}`
    case "next":
      return `// app/layout.tsx
import Script from "next/script"

<Script defer data-key="YOUR_WRITE_KEY" src="${origin}/script.js" />

// In the client component that handles signup
"use client"
const user = await createAccount(values)
window.zani?.identify(user.id, { email: user.email })`
    case "vue":
      return `async function onSubmit() {
  const user = await createAccount(form)
  window.zani?.identify(user.id, { email: user.email })
  router.push("/welcome")
}`
    case "types":
      return `declare global {
  interface Window {
    zani?: {
      identify(userId: string, traits?: { email?: string }): void
      track(name: string, props?: Record<string, string | number | boolean>): void
      anonymousId?: string
    }
  }
}

export {}`
    default: {
      const exhaustive: never = framework
      return exhaustive
    }
  }
}

type StripeLink = "checkout" | "customer"

const stripeLinks: readonly StripeLink[] = ["checkout", "customer"]

const stripeLinkLabels: Record<StripeLink, string> = {
  checkout: "Checkout",
  customer: "Customer",
}

const stripeSnippets: Record<StripeLink, string> = {
  checkout: `await stripe.checkout.sessions.create({
  mode: "subscription",
  client_reference_id: user.id,
  customer_email: user.email,
  line_items: [{ price: priceId, quantity: 1 }],
  success_url,
  cancel_url,
})`,
  customer: `await stripe.customers.create({
  email: user.email,
  metadata: { zani_user_id: user.id },
})`,
}

export function IdentifyStep({
  domain,
  setup,
}: {
  domain: string
  setup: SiteSetup | null
}) {
  const [framework, setFramework] = useState<Framework>("javascript")
  const [stripeLink, setStripeLink] = useState<StripeLink>("checkout")

  return (
    <div className="space-y-4">
      {setup?.lastIdentifyAt ? (
        <p className="text-sm text-muted-foreground">
          Last signup {formatRelative(setup.lastIdentifyAt)}. Attribution is
          saved at signup, so earlier visits keep their source.
        </p>
      ) : (
        <EmptyNote>
          No signups yet. Add the call below, then sign up on {domain} with a
          test account. It shows up here within a few seconds.
        </EmptyNote>
      )}
      <div className="space-y-2">
        <Segmented
          label="Framework"
          options={frameworks}
          value={framework}
          labels={frameworkLabels}
          onChange={setFramework}
        />
        <CodeBlock
          code={identifySnippet(framework, window.location.origin)}
          label="Copy identify snippet"
          language={framework === "javascript" ? "js" : "tsx"}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Then pass the same id to Stripe so customers link to their signup.
          Customers with a matching email are linked too.
        </p>
        <Segmented
          label="Stripe link"
          options={stripeLinks}
          value={stripeLink}
          labels={stripeLinkLabels}
          onChange={setStripeLink}
        />
        <CodeBlock
          code={stripeSnippets[stripeLink]}
          label="Copy Stripe snippet"
          language="js"
        />
      </div>
    </div>
  )
}

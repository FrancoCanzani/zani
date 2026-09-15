import { createFileRoute } from "@tanstack/react-router"

import { Button } from "@workspace/ui/components/button"

export const Route = createFileRoute("/")({ component: Home })

function Home() {
  return (
    <main className="flex min-h-svh flex-col items-start gap-4 p-6">
      <div className="flex max-w-md min-w-0 flex-col gap-2 text-sm leading-loose">
        <h1 className="font-medium">SaaS foundation</h1>
        <p className="text-muted-foreground">
          File-based routing, the Worker, and shadcn/ui are wired. Product
          features are not implemented yet.
        </p>
        <Button type="button">shadcn/ui</Button>
      </div>
    </main>
  )
}

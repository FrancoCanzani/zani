import { Link } from "@tanstack/react-router"

import { Button } from "@components/ui/button"

export function SiteTabs({
  slug,
  siteId,
  active,
}: {
  slug: string
  siteId: string
  active: "traffic" | "revenue"
}) {
  return (
    <nav className="flex items-center gap-1">
      <Button
        asChild
        size="sm"
        variant={active === "traffic" ? "secondary" : "ghost"}
      >
        <Link to="/businesses/$slug/sites/$siteId" params={{ slug, siteId }}>
          Traffic
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={active === "revenue" ? "secondary" : "ghost"}
      >
        <Link
          to="/businesses/$slug/sites/$siteId/revenue"
          params={{ slug, siteId }}
        >
          Revenue
        </Link>
      </Button>
    </nav>
  )
}

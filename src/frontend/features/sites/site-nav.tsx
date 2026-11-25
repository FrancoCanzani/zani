import { Link } from "@tanstack/react-router"

const tabs = [
  {
    to: "/businesses/$slug/sites/$siteId",
    label: "Overview",
  },
  {
    to: "/businesses/$slug/sites/$siteId/revenue",
    label: "Revenue",
  },
  {
    to: "/businesses/$slug/sites/$siteId/activity",
    label: "Activity",
  },
] as const

export function SiteNav({ slug, siteId }: { slug: string; siteId: string }) {
  return (
    <nav
      aria-label="Site sections"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-lg shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        {tabs.map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            params={{ slug, siteId }}
            search={(prev) => ({ ...prev, live: false })}
            activeOptions={{ exact: true, includeSearch: false }}
            className="flex h-8 items-center rounded-full px-4 text-[13px] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:text-background"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

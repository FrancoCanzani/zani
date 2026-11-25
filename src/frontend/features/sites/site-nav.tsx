import { Link } from "@tanstack/react-router"
import {
  ActivityIcon,
  ChartColumnIcon,
  CircleDollarSignIcon,
  type LucideIcon,
} from "lucide-react"

const tabs = [
  {
    to: "/businesses/$slug/sites/$siteId",
    label: "Overview",
    icon: ChartColumnIcon,
  },
  {
    to: "/businesses/$slug/sites/$siteId/revenue",
    label: "Revenue",
    icon: CircleDollarSignIcon,
  },
  {
    to: "/businesses/$slug/sites/$siteId/activity",
    label: "Activity",
    icon: ActivityIcon,
  },
] as const satisfies ReadonlyArray<{
  to: string
  label: string
  icon: LucideIcon
}>

export function SiteNav({ slug, siteId }: { slug: string; siteId: string }) {
  return (
    <nav
      aria-label="Site sections"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-30 flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-background/85 p-1 shadow-lg shadow-black/5 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        {tabs.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            params={{ slug, siteId }}
            search={(prev) => ({ ...prev, live: false })}
            activeOptions={{ exact: true, includeSearch: false }}
            className="flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground data-[status=active]:bg-foreground data-[status=active]:text-background"
          >
            <Icon className="size-3.5" aria-hidden />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  )
}

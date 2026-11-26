import { useState } from "react"

import { ActivityFeed } from "./activity-feed"
import { useSiteSearch } from "./use-site-search"

export function ActivityPage() {
  const { slug, siteId, range, filters, includeBots, toggleFilter } =
    useSiteSearch()
  const [now] = useState(Date.now)

  return (
    <ActivityFeed
      slug={slug}
      siteId={siteId}
      range={range}
      filters={filters}
      includeBots={includeBots}
      live={false}
      framed
      now={now}
      onSelect={toggleFilter}
    />
  )
}

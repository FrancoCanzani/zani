import { getRouteApi, useNavigate } from "@tanstack/react-router"
import { startTransition } from "react"

import { statsQueryFromSearch } from "./api"
import { dependentFilters, type FilterKey, type SiteSearch } from "./search"

const routeApi = getRouteApi(
  "/_authed/businesses/$slug/_shell/sites/$siteId/_dashboard"
)

export function useSiteSearch() {
  const { slug, siteId } = routeApi.useParams()
  const search = routeApi.useSearch()
  const navigate = useNavigate()

  function patchSearch(patch: Partial<SiteSearch>) {
    startTransition(() => {
      void navigate({
        to: ".",
        search: () => {
          const next = { ...search, ...patch }
          for (const key of Object.keys(patch) as Array<keyof SiteSearch>) {
            if (patch[key] === undefined) delete next[key]
          }
          return next
        },
        resetScroll: false,
      })
    })
  }

  function toggleFilter(key: FilterKey, value: string) {
    patchSearch({
      ...dependentFilters(key),
      [key]: search[key] === value ? undefined : value,
    })
  }

  return {
    slug,
    siteId,
    search,
    timeZone: search.tz || "UTC",
    ...statsQueryFromSearch(search),
    patchSearch,
    toggleFilter,
  }
}

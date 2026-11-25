import type { FilterKey, SiteSearch } from "./search"

export type Breakdown =
  | "path"
  | "referrer"
  | "referrer_path"
  | "country"
  | "city"
  | "browser"
  | "device"
  | "os"
  | "screen"
  | "event"
  | "prop_key"
  | "prop_value"
  | "utm_source"
  | "utm_medium"
  | "utm_campaign"
  | "utm_content"
  | "utm_term"
  | "entry"
  | "exit"

export type BreakdownTab = {
  key: Breakdown | "map"
  label: string
  filterKey: FilterKey
  view?: "list" | "map"
}

export type BreakdownPanelConfig = {
  id: string
  title: string
  tabs: BreakdownTab[]
}

export const breakdownPanels: BreakdownPanelConfig[] = [
  {
    id: "pages",
    title: "Pages",
    tabs: [
      { key: "path", label: "Path", filterKey: "path" },
      { key: "entry", label: "Entry", filterKey: "path" },
      { key: "exit", label: "Exit", filterKey: "path" },
    ],
  },
  {
    id: "referrers",
    title: "Referrers",
    tabs: [{ key: "referrer", label: "Referrer", filterKey: "referrer" }],
  },
  {
    id: "events",
    title: "Events",
    tabs: [{ key: "event", label: "Name", filterKey: "event" }],
  },
  {
    id: "utm",
    title: "UTM",
    tabs: [
      { key: "utm_source", label: "Source", filterKey: "utm_source" },
      { key: "utm_medium", label: "Medium", filterKey: "utm_medium" },
      { key: "utm_campaign", label: "Campaign", filterKey: "utm_campaign" },
      { key: "utm_content", label: "Content", filterKey: "utm_content" },
      { key: "utm_term", label: "Term", filterKey: "utm_term" },
    ],
  },
  {
    id: "countries",
    title: "Countries",
    tabs: [
      { key: "map", label: "Map", filterKey: "country", view: "map" },
      { key: "country", label: "List", filterKey: "country", view: "list" },
      { key: "city", label: "City", filterKey: "city", view: "list" },
    ],
  },
  {
    id: "devices",
    title: "Devices",
    tabs: [
      { key: "browser", label: "Browser", filterKey: "browser" },
      { key: "os", label: "OS", filterKey: "os" },
      { key: "device", label: "Device", filterKey: "device" },
      { key: "screen", label: "Screen", filterKey: "screen" },
    ],
  },
]

export function breakdownKey(tab: BreakdownTab): Breakdown {
  return tab.key === "map" ? "country" : tab.key
}

export function panelTabsForSearch(
  panel: BreakdownPanelConfig,
  search: SiteSearch
): BreakdownTab[] {
  switch (panel.id) {
    case "referrers":
      if (search.referrer !== undefined) {
        return [
          {
            key: "referrer_path",
            label: "Path",
            filterKey: "referrer_path",
          },
        ]
      }
      return panel.tabs
    case "events":
      if (search.event !== undefined && search.prop !== undefined) {
        return [
          {
            key: "prop_value",
            label: "Value",
            filterKey: "prop_value",
          },
        ]
      }
      if (search.event !== undefined) {
        return [
          {
            key: "prop_key",
            label: "Property",
            filterKey: "prop",
          },
        ]
      }
      return panel.tabs
    default:
      return panel.tabs
  }
}

export const defaultPanelBreakdowns: Breakdown[] = breakdownPanels.map(
  (panel) => breakdownKey(panel.tabs[0]!)
)

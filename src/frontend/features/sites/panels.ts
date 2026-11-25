import type { FilterKey } from "./search"

export type Breakdown =
  | "source"
  | "path"
  | "referrer"
  | "country"
  | "city"
  | "browser"
  | "device"
  | "os"
  | "screen"
  | "event"
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

export const breakdownPanels: Array<{
  id: string
  title: string
  tabs: BreakdownTab[]
}> = [
  {
    id: "sources",
    title: "Sources",
    tabs: [
      { key: "source", label: "Channel", filterKey: "source" },
      { key: "referrer", label: "Referrer", filterKey: "referrer" },
    ],
  },
  {
    id: "pages",
    title: "Pages",
    tabs: [
      { key: "entry", label: "Entry", filterKey: "path" },
      { key: "path", label: "All", filterKey: "path" },
      { key: "exit", label: "Exit", filterKey: "path" },
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
      { key: "device", label: "Device", filterKey: "device" },
      { key: "browser", label: "Browser", filterKey: "browser" },
      { key: "os", label: "OS", filterKey: "os" },
      { key: "screen", label: "Screen", filterKey: "screen" },
    ],
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
    id: "events",
    title: "Events",
    tabs: [{ key: "event", label: "Name", filterKey: "event" }],
  },
]

export function breakdownKey(tab: BreakdownTab): Breakdown {
  return tab.key === "map" ? "country" : tab.key
}

export const defaultPanelBreakdowns: Breakdown[] = breakdownPanels.map(
  (panel) => breakdownKey(panel.tabs[0]!)
)

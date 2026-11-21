import { useMemo, useState, type MouseEvent } from "react"
import { createPortal } from "react-dom"
import {
  alpha2ToNumeric,
  getName,
  numericToAlpha2,
  registerLocale,
} from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { feature } from "topojson-client"
import type {
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from "geojson"
import type { Topology, GeometryCollection } from "topojson-specification"
import countries110m from "world-atlas/countries-110m.json"

registerLocale(enLocale)

type CountriesMapProps = {
  points: Array<{ series: string; views: number }>
  activeValue: string | undefined
  onSelect: (country: string) => void
}

type HoverState = {
  code: string
  name: string
  views: number
  share: number
  x: number
  y: number
}

const topology = countries110m as unknown as Topology<{
  countries: GeometryCollection
}>

const countriesGeo = feature(
  topology,
  topology.objects.countries
) as FeatureCollection<Geometry, GeoJsonProperties>

const emptyFill = "#E8EAED"
const dataBlue = "#5B8DEF"
const selectedBlue = "#3B6FD4"

function formatCompact(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
}

function hoverFromEvent(
  event: MouseEvent,
  code: string,
  name: string,
  views: number,
  totalViews: number
): HoverState {
  return {
    code,
    name,
    views,
    share: totalViews === 0 ? 0 : views / totalViews,
    x: event.clientX,
    y: event.clientY,
  }
}

export function CountriesMap({
  points,
  activeValue,
  onSelect,
}: CountriesMapProps) {
  const [hover, setHover] = useState<HoverState | null>(null)

  const { byNumeric, totalViews, maxViews } = useMemo(() => {
    const map = new Map<string, number>()
    let total = 0
    for (const point of points) {
      const code = point.series.trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(code)) continue
      const numeric = alpha2ToNumeric(code)
      if (numeric == null) continue
      const id = String(numeric).padStart(3, "0")
      map.set(id, (map.get(id) ?? 0) + point.views)
      total += point.views
    }
    return {
      byNumeric: map,
      totalViews: total,
      maxViews: Math.max(1, ...map.values()),
    }
  }, [points])

  const tooltip =
    hover && typeof document !== "undefined"
      ? createPortal(
          <div
            className="pointer-events-none fixed z-50 min-w-[160px] -translate-x-1/2 -translate-y-[calc(100%+12px)] rounded-md border border-border/80 bg-popover px-2.5 py-2 shadow-md"
            style={{ left: hover.x, top: hover.y }}
          >
            <div className="text-[13px] font-semibold tracking-tight text-foreground">
              <span className="font-mono">{hover.code}</span>{" "}
              <span>{hover.name}</span>
            </div>
            <div className="mt-0.5 text-[12px] text-muted-foreground">
              {formatCompact(hover.views)} views ·{" "}
              {(hover.share * 100).toFixed(1)}%
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <div className="relative w-full" onMouseLeave={() => setHover(null)}>
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 155, center: [0, 8] }}
        width={800}
        height={420}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <Geographies geography={countriesGeo}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const numeric = String(geo.id ?? "").padStart(3, "0")
              const views = byNumeric.get(numeric)
              const alpha2 = numericToAlpha2(numeric) ?? ""
              const selected = activeValue === alpha2
              const name =
                (alpha2 ? getName(alpha2, "en") : undefined) ??
                (typeof geo.properties?.name === "string"
                  ? geo.properties.name
                  : alpha2)
              const fill =
                views == null
                  ? emptyFill
                  : selected
                    ? selectedBlue
                    : `color-mix(in srgb, ${dataBlue} ${Math.max(45, Math.round((views / maxViews) * 100))}%, ${emptyFill})`

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.5}
                  style={{
                    outline: "none",
                    cursor: alpha2 ? "pointer" : "default",
                  }}
                  onMouseEnter={(event) => {
                    if (!alpha2 || views == null) {
                      setHover(null)
                      return
                    }
                    setHover(
                      hoverFromEvent(
                        event,
                        alpha2,
                        name || alpha2,
                        views,
                        totalViews
                      )
                    )
                  }}
                  onMouseMove={(event) => {
                    if (!alpha2 || views == null) return
                    setHover(
                      hoverFromEvent(
                        event,
                        alpha2,
                        name || alpha2,
                        views,
                        totalViews
                      )
                    )
                  }}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    if (!alpha2) return
                    onSelect(alpha2)
                  }}
                />
              )
            })
          }
        </Geographies>
      </ComposableMap>
      {tooltip}
    </div>
  )
}

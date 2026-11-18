import { useMemo, useState } from "react"
import { alpha2ToNumeric, numericToAlpha2 } from "i18n-iso-countries"
import { ComposableMap, Geographies, Geography } from "react-simple-maps"
import { feature } from "topojson-client"
import type {
  FeatureCollection,
  Geometry,
  GeoJsonProperties,
} from "geojson"
import type { Topology, GeometryCollection } from "topojson-specification"
import countries110m from "world-atlas/countries-110m.json"

type CountriesMapProps = {
  points: Array<{ series: string; views: number }>
  activeValue: string | undefined
  onSelect: (country: string) => void
}

const topology = countries110m as unknown as Topology<{
  countries: GeometryCollection
}>

const countriesGeo = feature(
  topology,
  topology.objects.countries
) as FeatureCollection<Geometry, GeoJsonProperties>

export function CountriesMap({
  points,
  activeValue,
  onSelect,
}: CountriesMapProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const byNumeric = useMemo(() => {
    const map = new Map<string, number>()
    for (const point of points) {
      const code = point.series.trim().toUpperCase()
      if (!/^[A-Z]{2}$/.test(code)) continue
      const numeric = alpha2ToNumeric(code)
      if (numeric == null) continue
      const id = String(numeric).padStart(3, "0")
      map.set(id, (map.get(id) ?? 0) + point.views)
    }
    return map
  }, [points])

  const maxViews = Math.max(1, ...byNumeric.values())

  return (
    <div className="w-full overflow-hidden rounded-md bg-muted/20">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 147 }}
        width={800}
        height={360}
        style={{ width: "100%", height: "auto" }}
      >
        <Geographies geography={countriesGeo}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const numeric = String(geo.id ?? "").padStart(3, "0")
              const views = byNumeric.get(numeric)
              const alpha2 = numericToAlpha2(numeric) ?? ""
              const selected = activeValue === alpha2
              const isHovered = hovered === alpha2
              const fill =
                views == null
                  ? "var(--muted)"
                  : selected || isHovered
                    ? "var(--foreground)"
                    : `color-mix(in oklab, var(--foreground) ${Math.max(12, Math.round((views / maxViews) * 72))}%, var(--muted))`

              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={fill}
                  stroke="var(--background)"
                  strokeWidth={0.4}
                  style={{
                    outline: "none",
                    cursor: alpha2 ? "pointer" : "default",
                  }}
                  onMouseEnter={() => {
                    if (alpha2) setHovered(alpha2)
                  }}
                  onMouseLeave={() => setHovered(null)}
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
    </div>
  )
}

import {
  BotIcon,
  GlobeIcon,
  LinkIcon,
  MailIcon,
  MonitorIcon,
  SmartphoneIcon,
  TabletIcon,
  TerminalIcon,
} from "lucide-react"
import { getName, registerLocale } from "i18n-iso-countries"
import enLocale from "i18n-iso-countries/langs/en.json"
import { useState } from "react"

import type { Breakdown } from "./panels"

registerLocale(enLocale)

export function dimensionLabel(dimension: Breakdown, value: string) {
  if (!value) return dimension === "source" ? "direct" : "(none)"
  if (dimension === "country") return getName(value, "en") ?? value
  return value
}

const channelHosts: Record<string, string> = {
  google: "google.com",
  bing: "bing.com",
  duckduckgo: "duckduckgo.com",
  twitter: "x.com",
  reddit: "reddit.com",
  "hacker news": "news.ycombinator.com",
  "product hunt": "producthunt.com",
  linkedin: "linkedin.com",
  facebook: "facebook.com",
  github: "github.com",
  youtube: "youtube.com",
  chatgpt: "chatgpt.com",
}

const browserHosts: Record<string, string> = {
  chrome: "chrome.com",
  safari: "apple.com",
  firefox: "firefox.com",
  edge: "microsoftedge.com",
  samsung: "samsung.com",
  opera: "opera.com",
  brave: "brave.com",
}

const osHosts: Record<string, string> = {
  macos: "apple.com",
  ios: "apple.com",
  windows: "microsoft.com",
  android: "android.com",
}

const iconClass = "size-3.5 shrink-0 text-muted-foreground"

function Favicon({ host }: { host: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <GlobeIcon aria-hidden className={iconClass} />
  return (
    <img
      src={`https://icons.duckduckgo.com/ip3/${host}.ico`}
      alt=""
      width={14}
      height={14}
      loading="lazy"
      className="size-3.5 shrink-0 rounded-[3px]"
      onError={() => setFailed(true)}
    />
  )
}

function flag(code: string) {
  if (!/^[A-Za-z]{2}$/.test(code)) return null
  const base = 0x1f1e6 - 65
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split("")
      .map((char) => base + char.charCodeAt(0))
  )
}

export function DimensionIcon({
  dimension,
  value,
}: {
  dimension: Breakdown
  value: string
}) {
  switch (dimension) {
    case "source": {
      if (value === "direct" || value === "")
        return <LinkIcon aria-hidden className={iconClass} />
      if (value === "newsletter" || value === "email")
        return <MailIcon aria-hidden className={iconClass} />
      const host = channelHosts[value] ?? (value.includes(".") ? value : null)
      return host ? (
        <Favicon key={host} host={host} />
      ) : (
        <GlobeIcon aria-hidden className={iconClass} />
      )
    }
    case "referrer":
      return value ? (
        <Favicon key={value} host={value} />
      ) : (
        <LinkIcon aria-hidden className={iconClass} />
      )
    case "country": {
      const emoji = flag(value)
      return emoji ? (
        <span aria-hidden className="w-3.5 shrink-0 text-[13px] leading-none">
          {emoji}
        </span>
      ) : (
        <GlobeIcon aria-hidden className={iconClass} />
      )
    }
    case "device":
      if (value === "mobile")
        return <SmartphoneIcon aria-hidden className={iconClass} />
      if (value === "tablet")
        return <TabletIcon aria-hidden className={iconClass} />
      return <MonitorIcon aria-hidden className={iconClass} />
    case "browser": {
      if (value === "bot") return <BotIcon aria-hidden className={iconClass} />
      const host = browserHosts[value]
      return host ? (
        <Favicon key={host} host={host} />
      ) : (
        <GlobeIcon aria-hidden className={iconClass} />
      )
    }
    case "os": {
      if (value === "linux")
        return <TerminalIcon aria-hidden className={iconClass} />
      const host = osHosts[value]
      return host ? (
        <Favicon key={host} host={host} />
      ) : (
        <MonitorIcon aria-hidden className={iconClass} />
      )
    }
    case "referrer_path":
    case "prop_key":
    case "prop_value":
    case "path":
    case "entry":
    case "exit":
    case "city":
    case "screen":
    case "event":
    case "utm_source":
    case "utm_medium":
    case "utm_campaign":
    case "utm_content":
    case "utm_term":
      return null
    default: {
      const exhaustive: never = dimension
      return exhaustive
    }
  }
}

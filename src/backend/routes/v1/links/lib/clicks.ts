import {
  click,
  type ClickBrowser,
  type ClickDevice,
  type ClickOs,
} from "../../../../db/schema"
import { createDb } from "../../../../lib/db"
import { newId, nowMs } from "../../../../lib/id"

export type ClickEvent = {
  code: string
  workspaceId: string
  country: string
  referrerHost: string
  device: ClickDevice
  browser: ClickBrowser
  os: ClickOs
  bot: boolean
}

export function writeClick(clicks: AnalyticsEngineDataset, event: ClickEvent) {
  clicks.writeDataPoint({
    indexes: [event.code],
    blobs: [
      event.workspaceId,
      event.country,
      event.referrerHost,
      event.device,
      event.browser,
      event.os,
    ],
    doubles: [event.bot ? 1 : 0],
  })
}

export async function recordClick(
  env: Env,
  link: { id: string; workspaceId: string; code: string },
  request: Request
) {
  const event = clickEvent(request, link)
  writeClick(env.CLICKS, event)
  const db = createDb(env)
  await db.insert(click).values({
    id: newId(),
    linkId: link.id,
    workspaceId: link.workspaceId,
    occurredAt: nowMs(),
    country: event.country || null,
    referrerHost: event.referrerHost,
    device: event.device,
    browser: event.browser,
    os: event.os,
    bot: event.bot,
  })
}

function clickEvent(
  request: Request,
  link: { code: string; workspaceId: string }
): ClickEvent {
  const ua = request.headers.get("user-agent") ?? ""
  return {
    code: link.code,
    workspaceId: link.workspaceId,
    country: countryOf(request),
    referrerHost: referrerHost(request),
    device: deviceOf(ua),
    browser: browserOf(ua),
    os: osOf(ua),
    bot: /bot|crawl|spider|slurp|preview/i.test(ua),
  }
}

function countryOf(request: Request) {
  const cf = request.cf
  if (!cf || typeof cf !== "object" || !("country" in cf)) {
    return ""
  }
  return typeof cf.country === "string" ? cf.country : ""
}

function referrerHost(request: Request) {
  const referrer = request.headers.get("referer")
  if (!referrer) {
    return ""
  }
  try {
    return new URL(referrer).host
  } catch {
    return ""
  }
}

function deviceOf(ua: string): ClickDevice {
  if (/iPad|Tablet/i.test(ua)) return "tablet"
  if (/Mobile|iPhone|Android/i.test(ua)) return "phone"
  return "desktop"
}

function browserOf(ua: string): ClickBrowser {
  if (/Edg\//.test(ua)) return "edge"
  if (/Chrome\//.test(ua)) return "chrome"
  if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "safari"
  if (/Firefox\//.test(ua)) return "firefox"
  return "other"
}

function osOf(ua: string): ClickOs {
  if (/iPhone|iPad/.test(ua)) return "ios"
  if (/Android/.test(ua)) return "android"
  if (/Mac OS/.test(ua)) return "macos"
  if (/Windows/.test(ua)) return "windows"
  if (/Linux/.test(ua)) return "linux"
  return "other"
}

import { and, eq, ne, notLike } from "drizzle-orm"

import {
  event,
  site,
  user,
  workspace,
  workspaceMember,
} from "../../../../db/schema"
import type { createDb } from "../../../../lib/db"
import { sendAppEmail } from "../../../../lib/mail"
import { simVisitorPrefix } from "../../sites/lib/simulate"

type Db = ReturnType<typeof createDb>

// Per-isolate memo so busy sites skip the lookup after their first request.
const sitesWithHistory = new Set<string>()

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

export async function notifyFirstPageview(
  env: Env,
  db: Db,
  input: { site: typeof site.$inferSelect; eventId: string; path: string }
) {
  if (sitesWithHistory.has(input.site.id)) return

  const [earlier] = await db
    .select({ id: event.id })
    .from(event)
    .where(
      and(
        eq(event.siteId, input.site.id),
        eq(event.name, "pageview"),
        ne(event.id, input.eventId),
        notLike(event.visitorId, `${simVisitorPrefix}%`)
      )
    )
    .limit(1)
  sitesWithHistory.add(input.site.id)
  if (earlier) return

  const members = await db
    .select({ email: user.email, slug: workspace.slug })
    .from(workspaceMember)
    .innerJoin(user, eq(user.id, workspaceMember.userId))
    .innerJoin(workspace, eq(workspace.id, workspaceMember.workspaceId))
    .where(eq(workspaceMember.workspaceId, input.site.workspaceId))

  for (const member of members) {
    const url = `${env.BETTER_AUTH_URL}/businesses/${member.slug}/sites/${input.site.id}`
    await sendAppEmail(env, undefined, {
      to: member.email,
      subject: `${input.site.name} recorded its first pageview`,
      text: `Zani is live on ${input.site.domain}. First pageview: ${input.path}\n\nOpen the dashboard: ${url}`,
      html: `<p>Zani is live on <strong>${escapeHtml(input.site.domain)}</strong>. First pageview: <code>${escapeHtml(input.path)}</code></p><p><a href="${url}">Open the dashboard</a></p>`,
      devLine: `[first-pageview] ${member.email} ${input.site.domain} ${input.path} ${url}`,
    })
  }
}

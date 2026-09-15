import { and, eq, sql } from "drizzle-orm"
import {
  user,
  workspaceInvite,
  workspaceMember,
} from "@workspace/db/schema"

import type { InviteRole } from "@shared/workspace"

import { createDb } from "./db"
import { newId, nowMs } from "./id"
import { sendAppEmail } from "./mail"
import { randomToken, sha256Hex } from "./token"

const INVITE_TTL_MS = 1000 * 60 * 60 * 24 * 7

export async function issueWorkspaceInvite(
  env: Env,
  ctx: Parameters<typeof sendAppEmail>[1],
  input: {
    workspace: { id: string; name: string; slug: string }
    email: string
    role: InviteRole
    createdByUserId: string
  }
) {
  const email = input.email.trim().toLowerCase()
  const db = createDb(env)
  const now = nowMs()

  const [existingMember] = await db
    .select({ id: workspaceMember.id })
    .from(workspaceMember)
    .innerJoin(user, eq(workspaceMember.userId, user.id))
    .where(
      and(
        eq(workspaceMember.workspaceId, input.workspace.id),
        sql`lower(${user.email}) = ${email}`
      )
    )
    .limit(1)

  if (existingMember) {
    return { skipped: "already_member" as const }
  }

  const token = randomToken()
  const tokenHash = await sha256Hex(token)
  const expiresAt = now + INVITE_TTL_MS

  const [existingInvite] = await db
    .select()
    .from(workspaceInvite)
    .where(
      and(
        eq(workspaceInvite.workspaceId, input.workspace.id),
        eq(workspaceInvite.email, email)
      )
    )
    .limit(1)

  if (existingInvite) {
    await db
      .update(workspaceInvite)
      .set({
        role: input.role,
        tokenHash,
        expiresAt,
        createdByUserId: input.createdByUserId,
      })
      .where(eq(workspaceInvite.id, existingInvite.id))
  } else {
    await db.insert(workspaceInvite).values({
      id: newId(),
      workspaceId: input.workspace.id,
      email,
      role: input.role,
      tokenHash,
      expiresAt,
      createdByUserId: input.createdByUserId,
      createdAt: now,
    })
  }

  const acceptUrl = `${env.BETTER_AUTH_URL}/invites/${token}`

  await sendAppEmail(env, ctx, {
    to: email,
    subject: `Join ${input.workspace.name}`,
    text: `You were invited to ${input.workspace.name}. Accept: ${acceptUrl}`,
    html: `<p>You were invited to <strong>${input.workspace.name}</strong>.</p><p><a href="${acceptUrl}">Accept invite</a></p>`,
    devLine: `[invite] ${email} ${input.workspace.slug} ${acceptUrl}`,
  })

  return { skipped: null }
}

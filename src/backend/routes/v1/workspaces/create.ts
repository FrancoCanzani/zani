import { zValidator } from "@hono/zod-validator"
import { eq } from "drizzle-orm"
import { Hono } from "hono"

import { createWorkspaceBodySchema } from "@shared/workspace"

import { workspace, workspaceMember } from "../../../db/schema"
import { createDb } from "../../../lib/db"
import { newId, nowMs } from "../../../lib/id"
import { requireSession } from "../../../middleware/session"
import type { AppEnv } from "../../../types"

import { issueWorkspaceInvite } from "./lib/invite"

export const createWorkspace = new Hono<AppEnv>().post(
  "/",
  requireSession,
  zValidator("json", createWorkspaceBodySchema),
  async (c) => {
    const body = c.req.valid("json")
    const db = createDb(c.env)
    const now = nowMs()

    const [taken] = await db
      .select({ id: workspace.id })
      .from(workspace)
      .where(eq(workspace.slug, body.slug))
      .limit(1)

    if (taken) {
      return c.json({ error: "slug_taken" as const }, 409)
    }

    const workspaceId = newId()
    const created = {
      id: workspaceId,
      name: body.name,
      slug: body.slug,
      plan: "free",
      createdAt: now,
      updatedAt: now,
    }

    await db.insert(workspace).values(created)
    await db.insert(workspaceMember).values({
      id: newId(),
      workspaceId,
      userId: c.var.user.id,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    })

    const ownerEmail = c.var.user.email.toLowerCase()
    for (const email of body.invites) {
      if (email.toLowerCase() === ownerEmail) {
        continue
      }
      await issueWorkspaceInvite(c.env, c.executionCtx, {
        workspace: created,
        email,
        role: "member",
        createdByUserId: c.var.user.id,
      })
    }

    return c.json(
      {
        workspace: {
          id: created.id,
          name: created.name,
          slug: created.slug,
          plan: created.plan,
          role: "owner" as const,
          createdAt: created.createdAt,
        },
      },
      201
    )
  }
)

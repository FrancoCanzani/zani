import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { acceptInvite } from "./accept"

export const invites = new Hono<AppEnv>().route("/", acceptInvite)

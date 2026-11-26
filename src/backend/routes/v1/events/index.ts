import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { post } from "./post"

export const events = new Hono<AppEnv>().route("/", post)

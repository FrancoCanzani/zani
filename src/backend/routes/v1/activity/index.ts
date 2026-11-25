import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { get } from "./get"

export const activity = new Hono<AppEnv>().route("/", get)

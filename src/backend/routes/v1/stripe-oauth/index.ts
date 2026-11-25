import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { get } from "./get"

export const stripeOauth = new Hono<AppEnv>().route("/", get)

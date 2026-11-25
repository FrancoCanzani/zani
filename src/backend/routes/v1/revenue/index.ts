import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { get } from "./get"

export const revenue = new Hono<AppEnv>().route("/", get)

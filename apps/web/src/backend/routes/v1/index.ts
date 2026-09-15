import { Hono } from "hono"

import type { AppEnv } from "../../types"

import { health } from "./health"
import { me } from "./me"

export const v1 = new Hono<AppEnv>().route("/health", health).route("/me", me)

import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { createLink } from "./create"
import { getLink } from "./get"
import { listLinks } from "./list"

export const links = new Hono<AppEnv>()
  .route("/", listLinks)
  .route("/", createLink)
  .route("/", getLink)

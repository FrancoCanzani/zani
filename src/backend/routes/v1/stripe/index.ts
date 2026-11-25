import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { remove } from "./delete"
import { get } from "./get"
import { post } from "./post"
import { webhook } from "./webhook"

export const stripeWorkspace = new Hono<AppEnv>()
  .route("/", get)
  .route("/", post)
  .route("/", remove)

export const stripe = new Hono<AppEnv>().route("/", webhook)

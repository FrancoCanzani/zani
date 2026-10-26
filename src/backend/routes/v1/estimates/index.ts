import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { createEstimate } from "./create"
import { getEstimate } from "./get"
import { listEstimates } from "./list"
import { removeEstimate } from "./remove"
import { updateEstimate } from "./update"

export const estimates = new Hono<AppEnv>()
  .route("/", listEstimates)
  .route("/", createEstimate)
  .route("/", getEstimate)
  .route("/", updateEstimate)
  .route("/", removeEstimate)

import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { createCustomer } from "./create"
import { listCustomers } from "./list"
import { updateCustomer } from "./update"

export const customers = new Hono<AppEnv>()
  .route("/", listCustomers)
  .route("/", createCustomer)
  .route("/", updateCustomer)

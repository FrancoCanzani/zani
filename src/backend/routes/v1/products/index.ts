import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { archiveProduct } from "./archive"
import { createProduct } from "./create"
import { listProducts } from "./list"
import { updateProduct } from "./update"

export const products = new Hono<AppEnv>()
  .route("/", listProducts)
  .route("/", createProduct)
  .route("/", updateProduct)
  .route("/", archiveProduct)

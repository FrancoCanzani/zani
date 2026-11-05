import { Hono } from "hono"

import type { AppEnv } from "../../../types"

import { createInvoice } from "./create"
import { getInvoice } from "./get"
import { listInvoices } from "./list"
import { invoicePdf } from "./pdf"
import { markInvoicePaid } from "./mark-paid"
import { remindInvoice } from "./remind"
import { removeInvoice } from "./remove"
import { sendInvoice } from "./send"
import { updateInvoice } from "./update"

export const invoices = new Hono<AppEnv>()
  .route("/", listInvoices)
  .route("/", createInvoice)
  .route("/", getInvoice)
  .route("/", invoicePdf)
  .route("/", updateInvoice)
  .route("/", removeInvoice)
  .route("/", sendInvoice)
  .route("/", remindInvoice)
  .route("/", markInvoicePaid)

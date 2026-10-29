import type { InvoiceStatus } from "./api"

export function invoiceStatusLabel(status: InvoiceStatus) {
  switch (status) {
    case "draft":
      return "Draft"
    case "sent":
      return "Sent"
    case "partially_paid":
      return "Partial"
    case "paid":
      return "Paid"
    case "void":
      return "Void"
    default: {
      const exhaustive: never = status
      return exhaustive
    }
  }
}

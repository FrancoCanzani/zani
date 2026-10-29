export function formatInvoiceNumber(prefix: string, sequence: number) {
  return `${prefix}${String(sequence).padStart(4, "0")}`
}

export function todayIsoDate(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10)
}

import { eq } from "drizzle-orm"

import { link } from "../../../../db/schema"
import type { createDb } from "../../../../lib/db"

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789"

export async function newLinkCode(db: ReturnType<typeof createDb>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode()
    const [taken] = await db
      .select({ id: link.id })
      .from(link)
      .where(eq(link.code, code))
      .limit(1)
    if (!taken) {
      return code
    }
  }
  throw new Error("could not allocate a link code")
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6))
  return Array.from(bytes, (byte) =>
    ALPHABET.charAt(byte % ALPHABET.length)
  ).join("")
}

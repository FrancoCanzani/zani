function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

export async function verifyStripeSignature(input: {
  payload: string
  header: string
  secret: string
  toleranceSec?: number
}) {
  const parts = input.header.split(",").map((part) => part.trim())
  let timestamp = ""
  const signatures: string[] = []
  for (const part of parts) {
    const [key, value] = part.split("=")
    if (key === "t" && value) timestamp = value
    if (key === "v1" && value) signatures.push(value)
  }
  if (!timestamp || signatures.length === 0) return false

  const tolerance = input.toleranceSec ?? 300
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp))
  if (!Number.isFinite(age) || age > tolerance) return false

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(input.secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${input.payload}`)
  )
  const digest = bytesToHex(new Uint8Array(signed))
  return signatures.some((signature) => timingSafeEqual(signature, digest))
}

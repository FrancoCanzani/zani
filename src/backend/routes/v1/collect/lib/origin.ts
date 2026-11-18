export function originHost(origin: string | undefined): string | null {
  if (!origin) return null
  try {
    return new URL(origin).hostname.toLowerCase().replace(/\.$/, "")
  } catch {
    return null
  }
}

export function stripWww(host: string): string {
  const normalized = host.toLowerCase().replace(/\.$/, "")
  return normalized.startsWith("www.") ? normalized.slice(4) : normalized
}

export function hostsMatch(left: string, right: string): boolean {
  return stripWww(left) === stripWww(right)
}

export function originAllowed(host: string | null, domain: string): boolean {
  return host !== null && hostsMatch(host, domain)
}

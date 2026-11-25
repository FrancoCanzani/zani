export function originHost(origin: string | undefined): string | null {
  if (!origin) return null
  try {
    return new URL(origin).hostname.toLowerCase().replace(/\.$/, "")
  } catch {
    return null
  }
}

const bareHost = (host: string) => host.toLowerCase().replace(/^www\./, "")

export function originAllowed(host: string | null, domain: string): boolean {
  return host !== null && bareHost(host) === bareHost(domain)
}

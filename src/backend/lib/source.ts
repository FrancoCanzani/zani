const knownReferrers: Array<[RegExp, string]> = [
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)duckduckgo\.com$/, "duckduckgo"],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, "twitter"],
  [/(^|\.)reddit\.com$/, "reddit"],
  [/^news\.ycombinator\.com$/, "hacker news"],
  [/(^|\.)producthunt\.com$/, "product hunt"],
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "linkedin"],
  [/(^|\.)(facebook\.com|fb\.com)$/, "facebook"],
  [/(^|\.)github\.com$/, "github"],
  [/(^|\.)youtube\.com$/, "youtube"],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, "chatgpt"],
]

export function sourceFor(utmSource: string, referrerHost: string) {
  if (utmSource) return utmSource.toLowerCase()
  if (!referrerHost) return "direct"
  for (const [pattern, name] of knownReferrers) {
    if (pattern.test(referrerHost)) return name
  }
  return referrerHost
}

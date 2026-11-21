const botPattern =
  /bot|spider|crawl|slurp|headless|phantom|selenium|wget|curl\/|python-requests|httpclient|scrapy|facebookexternalhit|pingdom|uptimerobot|pagespeed|lighthouse|google-inspectiontool|chrome-lighthouse|yandexbot|baiduspider|duckduckbot|bingpreview|linkedinbot|twitterbot|discordbot|slackbot|telegrambot|applebot|gptbot|claudebot|anthropic|bytespider|petalbot|semrush|ahrefs|mj12bot|dotbot|ia_archiver/i

export const botBrowser = "bot"

export function isBot(userAgent: string): boolean {
  const value = userAgent.trim()
  if (!value) return true
  return botPattern.test(value)
}

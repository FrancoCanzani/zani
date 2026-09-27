export type CachedLink = {
  id: string
  workspaceId: string
  destinationUrl: string
  disabled: boolean
}

function linkKey(code: string) {
  return `link:${code}`
}

export async function readCachedLink(kv: KVNamespace, code: string) {
  return kv.get<CachedLink>(linkKey(code), "json")
}

export async function writeCachedLink(
  kv: KVNamespace,
  code: string,
  link: CachedLink
) {
  await kv.put(linkKey(code), JSON.stringify(link))
}

export async function deleteCachedLink(kv: KVNamespace, code: string) {
  await kv.delete(linkKey(code))
}

const LAST_WORKSPACE_SLUG_KEY = "workspace-slug"

export function readLastWorkspaceSlug() {
  try {
    return localStorage.getItem(LAST_WORKSPACE_SLUG_KEY)
  } catch {
    return null
  }
}

export function writeLastWorkspaceSlug(slug: string) {
  try {
    localStorage.setItem(LAST_WORKSPACE_SLUG_KEY, slug)
  } catch {
    return
  }
}

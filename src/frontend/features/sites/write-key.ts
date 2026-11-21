import { useCallback, useSyncExternalStore } from "react"

function storageKey(siteId: string) {
  return `zani.writeKey.${siteId}`
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) {
    listener()
  }
}

export function rememberWriteKey(siteId: string, writeKey: string) {
  try {
    sessionStorage.setItem(storageKey(siteId), writeKey)
  } catch {
    // Private mode can throw.
  }
  emit()
}

export function readWriteKey(siteId: string) {
  try {
    return sessionStorage.getItem(storageKey(siteId))
  } catch {
    return null
  }
}

export function useRememberedWriteKey(siteId: string) {
  const writeKey = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    () => readWriteKey(siteId),
    () => null
  )
  const setWriteKey = useCallback(
    (value: string) => {
      rememberWriteKey(siteId, value)
    },
    [siteId]
  )
  return { writeKey, setWriteKey }
}

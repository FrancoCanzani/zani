import { useEffect, useRef, useState } from "react"

const AUTOSAVE_DELAY_MS = 800

export type AutosaveStatus = "saved" | "unsaved" | "saving" | "error"

export function useInvoiceSave<T>({
  value,
  enabled,
  auto,
  persist,
}: {
  value: T
  enabled: boolean
  auto: boolean
  persist: (value: T) => Promise<unknown>
}) {
  const json = JSON.stringify(value)
  const [savedJson, setSavedJson] = useState(json)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const latest = useRef({ json, value, persist, auto: enabled && auto })
  latest.current = { json, value, persist, auto: enabled && auto }
  const savedRef = useRef(savedJson)
  const inFlight = useRef<Promise<void> | null>(null)

  async function flush(): Promise<void> {
    if (inFlight.current) {
      await inFlight.current
      return flush()
    }
    const { json: target, value: body } = latest.current
    if (target === savedRef.current) {
      return
    }
    const run = (async () => {
      setSaving(true)
      try {
        await latest.current.persist(body)
        savedRef.current = target
        setSavedJson(target)
        setError(null)
      } catch (caught) {
        setError(caught instanceof Error ? caught : new Error("Save failed"))
        throw caught
      } finally {
        setSaving(false)
      }
    })()
    inFlight.current = run
    try {
      await run
    } finally {
      inFlight.current = null
    }
  }

  const flushRef = useRef(flush)
  flushRef.current = flush

  useEffect(() => {
    if (!enabled || !auto || json === savedRef.current) {
      return
    }
    const timer = window.setTimeout(() => {
      flushRef.current().catch(() => undefined)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, auto, json])

  const dirty = enabled && json !== savedJson

  useEffect(() => {
    if (!dirty) {
      return
    }
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  // Leaving the page cancels the debounce timer; send what's pending anyway.
  useEffect(() => {
    return () => {
      if (latest.current.auto && latest.current.json !== savedRef.current) {
        latest.current.persist(latest.current.value).catch(() => undefined)
      }
    }
  }, [])

  const status: AutosaveStatus = saving
    ? "saving"
    : error
      ? "error"
      : dirty
        ? "unsaved"
        : "saved"

  return { status, error, flush: () => flushRef.current() }
}

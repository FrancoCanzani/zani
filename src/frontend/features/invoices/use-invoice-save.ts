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
  const savedRef = useRef(savedJson)
  const mounted = useRef(true)
  const tail = useRef<Promise<void>>(Promise.resolve())

  function enqueue(): Promise<void> {
    const job = tail.current.then(async () => {
      const { json: target, value: body, persist: write } = latest.current
      if (target === savedRef.current) return
      if (mounted.current) setSaving(true)
      try {
        await write(body)
        savedRef.current = target
        if (!mounted.current) return
        setSavedJson(target)
        setError(null)
      } catch (caught) {
        const err = caught instanceof Error ? caught : new Error("Save failed")
        if (mounted.current) setError(err)
        throw err
      } finally {
        if (mounted.current) setSaving(false)
      }
    })
    tail.current = job.then(
      () => undefined,
      () => undefined
    )
    return job
  }

  const enqueueRef = useRef(enqueue)

  async function flush(): Promise<void> {
    do {
      await enqueueRef.current()
    } while (latest.current.json !== savedRef.current)
  }

  const flushRef = useRef(flush)

  // Saves run after commit, so the queue has to see this render's draft.
  useEffect(() => {
    latest.current = { json, value, persist, auto: enabled && auto }
    enqueueRef.current = enqueue
    flushRef.current = flush
  })

  useEffect(() => {
    if (!enabled || !auto || json === savedRef.current) return
    const timer = window.setTimeout(() => {
      enqueueRef.current().catch(() => undefined)
    }, AUTOSAVE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [enabled, auto, json])

  const dirty = enabled && json !== savedJson

  useEffect(() => {
    if (!dirty) return
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  // Leaving clears the debounce timer, so the pending draft joins the same queue.
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      const snap = latest.current
      if (snap.auto && snap.json !== savedRef.current) {
        enqueueRef.current().catch(() => undefined)
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

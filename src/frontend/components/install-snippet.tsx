import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@components/ui/button"
import { cn } from "@lib/utils"

type InstallSnippetProps = {
  label: string
  writeKey: string
  note: string
}

type TokenKind = "punct" | "tag" | "attr" | "string"

type Token = {
  kind: TokenKind
  text: string
}

function scriptSource(writeKey: string) {
  const src = `${window.location.origin}/script.js`
  return [
    "<script",
    "  defer",
    `  data-key="${writeKey}"`,
    `  src="${src}"`,
    "></script>",
  ].join("\n")
}

export function InstallSnippet({ label, writeKey, note }: InstallSnippetProps) {
  const source = scriptSource(writeKey)

  return (
    <section className="space-y-3 text-sm">
      <div className="space-y-2">
        <h2 className="text-muted-foreground">{label}</h2>
        <WriteKeyLine value={writeKey} />
      </div>
      <ScriptBlock source={source} />
      <p className="text-muted-foreground">{note}</p>
    </section>
  )
}

function WriteKeyLine({ value }: { value: string }) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const edges = useScrollEdges(scrollerRef, value)

  return (
    <div className="flex items-center gap-1">
      <div className="relative min-w-0 flex-1">
        <div
          ref={scrollerRef}
          className="no-scrollbar overflow-x-auto py-1 font-mono text-xs"
        >
          <span className="whitespace-nowrap">{value}</span>
        </div>
        <EdgeFade edges={edges} tone="background" />
      </div>
      <CopyButton value={value} label="Copy write key" />
    </div>
  )
}

function ScriptBlock({ source }: { source: string }) {
  const scrollerRef = useRef<HTMLPreElement>(null)
  const edges = useScrollEdges(scrollerRef, source)

  return (
    <div className="bg-secondary">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xs text-muted-foreground">html</span>
        <a
          href="#docs"
          onClick={(event) => {
            event.preventDefault()
          }}
          className="ml-auto text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Docs
        </a>
        <CopyButton value={source} label="Copy script" />
      </div>
      <div className="relative">
        <pre
          ref={scrollerRef}
          className="no-scrollbar overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed"
        >
          <code>
            {highlightHtml(source).map((token, index) => (
              <span key={index} className={tokenClass(token.kind)}>
                {token.text}
              </span>
            ))}
          </code>
        </pre>
        <EdgeFade edges={edges} tone="secondary" />
      </div>
    </div>
  )
}

function EdgeFade({
  edges,
  tone,
}: {
  edges: { start: boolean; end: boolean }
  tone: "background" | "secondary"
}) {
  const from = tone === "background" ? "from-background" : "from-secondary"

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r to-transparent backdrop-blur-sm transition-opacity",
          from,
          edges.start ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l to-transparent backdrop-blur-sm transition-opacity",
          from,
          edges.end ? "opacity-100" : "opacity-0"
        )}
      />
    </>
  )
}

function CopyButton({
  value,
  label,
  className,
}: {
  value: string
  label: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) {
      return
    }
    const timeout = window.setTimeout(() => {
      setCopied(false)
    }, 1200)
    return () => {
      window.clearTimeout(timeout)
    }
  }, [copied])

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      aria-label={copied ? "Copied" : label}
      className={className}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(
          () => {
            setCopied(true)
          },
          () => {
            toast.error("Could not copy.")
          }
        )
      }}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
    </Button>
  )
}

function useScrollEdges<T extends HTMLElement>(
  ref: RefObject<T | null>,
  value: string
) {
  const [edges, setEdges] = useState({ start: false, end: false })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) {
      return
    }
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setEdges({
        start: el.scrollLeft > 1,
        end: max - el.scrollLeft > 1,
      })
    }
    update()
    el.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [ref, value])

  return edges
}

function tokenClass(kind: TokenKind) {
  switch (kind) {
    case "punct":
      return "text-muted-foreground"
    case "tag":
      return "text-[#cf222e]"
    case "attr":
      return "text-[#953800]"
    case "string":
      return "text-[#0a3069]"
    default: {
      const exhaustive: never = kind
      return exhaustive
    }
  }
}

function highlightHtml(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0

  while (index < source.length) {
    if (source.startsWith("</", index) || source.charAt(index) === "<") {
      const closing = source.startsWith("</", index)
      tokens.push({ kind: "punct", text: closing ? "</" : "<" })
      index += closing ? 2 : 1
      const nameEnd = source.slice(index).search(/[\s>/]/)
      const name =
        nameEnd === -1
          ? source.slice(index)
          : source.slice(index, index + nameEnd)
      if (name.length > 0) {
        tokens.push({ kind: "tag", text: name })
        index += name.length
      }
      while (index < source.length && source.charAt(index) !== ">") {
        const char = source.charAt(index)
        if (char === " " || char === "\n") {
          const start = index
          while (
            index < source.length &&
            (source.charAt(index) === " " || source.charAt(index) === "\n")
          ) {
            index += 1
          }
          tokens.push({ kind: "punct", text: source.slice(start, index) })
          continue
        }
        if (char === '"' || char === "'") {
          const end = source.indexOf(char, index + 1)
          const stop = end === -1 ? source.length : end + 1
          tokens.push({ kind: "string", text: source.slice(index, stop) })
          index = stop
          continue
        }
        if (char === "=") {
          tokens.push({ kind: "punct", text: "=" })
          index += 1
          continue
        }
        const attrEnd = source.slice(index).search(/[\s=>]/)
        const attr =
          attrEnd === -1
            ? source.slice(index)
            : source.slice(index, index + attrEnd)
        if (attr.length === 0) {
          index += 1
          continue
        }
        tokens.push({ kind: "attr", text: attr })
        index += attr.length
      }
      if (source.charAt(index) === ">") {
        tokens.push({ kind: "punct", text: ">" })
        index += 1
      }
      continue
    }

    const next = source.indexOf("<", index)
    const stop = next === -1 ? source.length : next
    tokens.push({ kind: "punct", text: source.slice(index, stop) })
    index = stop
  }

  return tokens
}

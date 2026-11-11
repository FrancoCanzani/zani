import { useEffect, useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@components/ui/button"

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
      <p className="text-muted-foreground">
        Check the{" "}
        <a
          href="#docs"
          onClick={(event) => {
            event.preventDefault()
          }}
          className="underline underline-offset-4 hover:text-foreground"
        >
          docs
        </a>{" "}
        for how to install.
      </p>
      <p className="text-muted-foreground">{note}</p>
    </section>
  )
}

function WriteKeyLine({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto py-1 font-mono text-xs">
        <span className="whitespace-nowrap">{value}</span>
      </div>
      <CopyButton value={value} label="Copy write key" />
    </div>
  )
}

function ScriptBlock({ source }: { source: string }) {
  return (
    <div className="bg-secondary">
      <div className="flex items-center gap-3 px-3 py-2">
        <span className="text-xs text-muted-foreground">html</span>
        <CopyButton value={source} label="Copy script" className="ml-auto" />
      </div>
      <pre className="no-scrollbar overflow-x-auto px-3 pb-3 font-mono text-xs leading-relaxed">
        <code>
          {highlightHtml(source).map((token, index) => (
            <span key={index} className={tokenClass(token.kind)}>
              {token.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
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

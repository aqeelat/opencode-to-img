import hljs from "highlight.js"
import type { SyntaxColors } from "./types"

export interface Run {
  text: string
  color: string
}

function tokenColorMap(syntax: SyntaxColors): Record<string, string> {
  return {
    comment: syntax.comment,
    quote: syntax.comment,
    doctag: syntax.comment,
    meta: syntax.comment,
    keyword: syntax.keyword,
    "selector-tag": syntax.keyword,
    literal: syntax.keyword,
    name: syntax.keyword,
    type: syntax.type,
    class: syntax.type,
    tag: syntax.type,
    string: syntax.string,
    "meta-string": syntax.string,
    regexp: syntax.string,
    addition: syntax.string,
    number: syntax.number,
    symbol: syntax.number,
    bullet: syntax.number,
    attr: syntax.number,
    attribute: syntax.number,
    title: syntax.function,
    section: syntax.function,
    function: syntax.function,
    built_in: syntax.variable,
    variable: syntax.variable,
    "template-variable": syntax.variable,
    operator: syntax.operator,
    property: syntax.operator,
    punctuation: syntax.punctuation,
    deletion: syntax.keyword,
  }
}

function resolveColor(classFrames: string[][], map: Record<string, string>, base: string): string {
  for (let i = classFrames.length - 1; i >= 0; i--) {
    for (const cls of classFrames[i]) {
      const key = cls.startsWith("hljs-") ? cls.slice(5) : cls
      if (map[key]) return map[key]
    }
  }
  return base
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
}

export function highlightRuns(
  code: string,
  lang: string | undefined,
  base: string,
  syntax: SyntaxColors,
): Run[] {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext"
  let html: string
  try {
    html = hljs.highlight(code, { language }).value
  } catch {
    return [{ text: code, color: base }]
  }
  const map = tokenColorMap(syntax)
  const runs: Run[] = []
  const stack: string[][] = []
  const parts = html.split(/(<\/?span[^>]*>)/)
  for (const part of parts) {
    if (part === "") continue
    if (part === "</span>") {
      stack.pop()
      continue
    }
    const open = part.match(/^<span class="([^"]*)">$/)
    if (open) {
      stack.push(open[1].split(/\s+/).filter(Boolean))
      continue
    }
    if (part.startsWith("<")) continue
    const text = decodeEntities(part)
    if (text.length === 0) continue
    const color = resolveColor(stack, map, base)
    runs.push({ text, color })
  }
  return runs
}

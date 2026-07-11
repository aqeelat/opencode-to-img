import hljs from "highlight.js"
import { THEME_COLORS } from "./css"
import type { SyntaxColors, Theme } from "./types"

export interface Run {
  text: string
  color: string
}

const TOKEN_COLORS: Record<Theme, Record<string, string>> = {
  light: {
    comment: "#6a737d",
    quote: "#6a737d",
    doctag: "#6a737d",
    keyword: "#cf222e",
    "selector-tag": "#cf222e",
    literal: "#cf222e",
    type: "#cf222e",
    name: "#cf222e",
    string: "#0a3069",
    "meta-string": "#0a3069",
    regexp: "#0a3069",
    addition: "#0a3069",
    number: "#0550ae",
    symbol: "#0550ae",
    bullet: "#0550ae",
    title: "#8250df",
    section: "#8250df",
    function: "#8250df",
    attr: "#0550ae",
    attribute: "#0550ae",
    "built_in": "#953800",
    variable: "#953800",
    class: "#953800",
    "template-variable": "#953800",
    tag: "#116329",
    meta: "#6a737d",
    operator: "#0550ae",
    property: "#0550ae",
    deletion: "#82071e",
  },
  dark: {
    comment: "#8b949e",
    quote: "#8b949e",
    doctag: "#8b949e",
    keyword: "#ff7b72",
    "selector-tag": "#ff7b72",
    literal: "#ff7b72",
    type: "#ff7b72",
    name: "#ff7b72",
    string: "#a5d6ff",
    "meta-string": "#a5d6ff",
    regexp: "#a5d6ff",
    addition: "#a5d6ff",
    number: "#79c0ff",
    symbol: "#79c0ff",
    bullet: "#79c0ff",
    title: "#d2a8ff",
    section: "#d2a8ff",
    function: "#d2a8ff",
    attr: "#79c0ff",
    attribute: "#79c0ff",
    "built_in": "#ffa657",
    variable: "#ffa657",
    class: "#ffa657",
    "template-variable": "#ffa657",
    tag: "#7ee787",
    meta: "#8b949e",
    operator: "#79c0ff",
    property: "#79c0ff",
    deletion: "#ffa198",
  },
}

function themedTokenColors(theme: Theme, syntax?: SyntaxColors): Record<string, string> {
  if (!syntax) return TOKEN_COLORS[theme]
  return {
    ...TOKEN_COLORS[theme],
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
  theme: Theme,
  base: string,
  syntax = THEME_COLORS[theme].syntax,
): Run[] {
  const language = lang && hljs.getLanguage(lang) ? lang : "plaintext"
  let html: string
  try {
    html = hljs.highlight(code, { language }).value
  } catch {
    return [{ text: code, color: base }]
  }
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
    const color = resolveColor(stack, themedTokenColors(theme, syntax), base)
    runs.push({ text, color })
  }
  return runs
}

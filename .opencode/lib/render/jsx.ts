import React from "react"
import { marked } from "marked"
import { THEME_COLORS } from "./css"
import { FONT_FAMILY } from "./fonts"
import { highlightRuns } from "./highlight"
import type { Theme, ThemeColors } from "./types"

const h = React.createElement
type Style = Record<string, string | number>

function wordChunks(text: string): string[] {
  return (text.match(/\S+(?:\s+|$)|\s+/g) ?? [text])
    .filter(Boolean)
    .map((chunk) => chunk.replace(/ /g, "\u00a0").replace(/\t/g, "\u00a0\u00a0"))
}

function codeChunks(text: string): string[] {
  return wordChunks(text).flatMap((chunk) => {
    if (chunk.length <= 64) return [chunk]
    const parts: string[] = []
    for (let index = 0; index < chunk.length; index += 64) parts.push(chunk.slice(index, index + 64))
    return parts
  })
}

function inlineNodes(tokens: any, inherited: Style, c: ThemeColors): React.ReactNode[] {
  const out: React.ReactNode[] = []
  const appendText = (text: string, style: Style) => {
    const lines = text.split("\n")
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) out.push(h("span", { key: out.length, style: { width: "100%", height: 0 } }))
      for (const chunk of wordChunks(lines[i])) {
        out.push(h("span", { key: out.length, style }, chunk))
      }
    }
  }
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "text":
        if (t.tokens?.length) out.push(...inlineNodes(t.tokens, inherited, c))
        else appendText(String(t.text ?? ""), inherited)
        break
      case "strong":
        out.push(...inlineNodes(t.tokens, { ...inherited, fontWeight: 700 }, c))
        break
      case "em":
        out.push(...inlineNodes(t.tokens, { ...inherited, fontStyle: "italic" }, c))
        break
      case "del":
        out.push(...inlineNodes(t.tokens, { ...inherited, textDecoration: "line-through" }, c))
        break
      case "codespan":
        out.push(
          h(
            "span",
            {
              key: out.length,
              style: {
                color: c.inlineCodeText,
                backgroundColor: c.inlineCodeBg,
                borderRadius: 5,
                padding: "1px 5px",
                fontFamily: FONT_FAMILY,
                fontSize: 14,
              },
            },
            String(t.text ?? "").replace(/ /g, "\u00a0"),
          ),
        )
        break
      case "link":
        out.push(...inlineNodes(t.tokens, { ...inherited, color: c.accent }, c))
        break
      case "br":
        out.push(h("span", { key: out.length, style: { width: "100%", height: 0 } }))
        break
      case "image":
        out.push(h("img", { key: out.length, src: t.href, style: { maxWidth: "100%" } }))
        break
      default:
        appendText(String(t.text ?? t.raw ?? ""), inherited)
    }
  }
  return out
}

function inlineBlock(tokens: any, c: ThemeColors, style: Style, key: string) {
  return h(
    "div",
    {
      key,
      style: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        alignItems: "baseline",
        ...style,
      },
    },
    ...inlineNodes(tokens, {}, c),
  )
}

function codeLines(text: string, lang: string | undefined, theme: Theme, c: ThemeColors) {
  const lines: Array<Array<{ text: string; color: string }>> = [[]]
  for (const run of highlightRuns(text, lang, c.codeText, c.syntax)) {
    const parts = run.text.split("\n")
    parts.forEach((part, index) => {
      if (part) lines[lines.length - 1].push({ text: part, color: run.color })
      if (index < parts.length - 1) lines.push([])
    })
  }
  return lines
}

function renderCode(t: any, c: ThemeColors, theme: Theme, key: string) {
  const lines = codeLines(String(t.text ?? ""), t.lang, theme, c)
  return h(
    "div",
    {
      key,
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backgroundColor: c.codeBg,
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        fontFamily: FONT_FAMILY,
        fontSize: 13,
        lineHeight: 1.55,
      },
    },
    ...lines.map((line, li) =>
      h(
        "div",
        { key: li, style: { display: "flex", flexDirection: "row", flexWrap: "wrap" } },
        ...(line.length
          ? line.flatMap((run, ri) =>
              codeChunks(run.text).map((chunk, ci) =>
                h("span", { key: `${ri}-${ci}`, style: { color: run.color, whiteSpace: "pre" } }, chunk),
              ),
            )
          : [h("span", { key: 0 }, "\u00a0")]),
      ),
    ),
  )
}

function renderList(t: any, c: ThemeColors, theme: Theme, key: string): React.ReactNode {
  return h(
    "div",
    { key, style: { display: "flex", flexDirection: "column", marginBottom: 16 } },
    ...(t.items ?? []).map((item: any, i: number) => {
      const marker = t.ordered ? `${(t.start ?? 1) + i}.` : "•"
      return h(
        "div",
        { key: i, style: { display: "flex", flexDirection: "row", marginBottom: 5 } },
        h("span", { style: { color: c.muted, width: 25, flexShrink: 0 } }, marker),
        h(
          "div",
          { style: { display: "flex", flexDirection: "column", flex: 1 } },
          ...(item.tokens ?? []).map((tok: any, j: number) =>
            tok.type === "list"
              ? renderList(tok, c, theme, `${key}-${i}-${j}`)
              : inlineBlock(
                  tok.tokens ?? [{ type: "text", text: tok.text ?? "" }],
                  c,
                  { marginBottom: tok.type === "text" ? 0 : 5 },
                  `${key}-${i}-${j}`,
                ),
          ),
        ),
      )
    }),
  )
}

function renderTable(t: any, c: ThemeColors, key: string): React.ReactNode {
  const header = t.header ?? []
  const rows = t.rows ?? []
  const columns = Math.max(1, header.length, ...rows.map((row: any[]) => row.length))
  const width = `${100 / columns}%`
  const cell = (value: any, ci: number, heading: boolean) =>
    h(
      "div",
      {
        key: ci,
        style: {
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          width,
          flexShrink: 0,
          padding: "7px 11px",
          borderRight: ci < columns - 1 ? `1px solid ${c.border}` : "none",
          color: heading ? c.heading : c.text,
          fontWeight: heading ? 700 : 400,
          fontSize: 14,
        },
      },
      ...inlineNodes(value?.tokens ?? [{ type: "text", text: value?.text ?? "" }], {}, c),
    )
  const row = (values: any[], ri: number, heading: boolean) =>
    h(
      "div",
      {
        key: ri,
        style: {
          display: "flex",
          flexDirection: "row",
          width: "100%",
          backgroundColor: heading ? c.codeBg : "transparent",
          borderBottom: ri < rows.length ? `1px solid ${c.border}` : "none",
        },
      },
      ...Array.from({ length: columns }, (_, ci) => cell(values[ci], ci, heading)),
    )
  return h(
    "div",
    {
      key,
      style: {
        display: "flex",
        flexDirection: "column",
        width: "100%",
        border: `1px solid ${c.border}`,
        marginBottom: 16,
      },
    },
    ...(header.length ? [row(header, 0, true)] : []),
    ...rows.map((values: any[], ri: number) => row(values, ri + 1, false)),
  )
}

function renderBlock(t: any, c: ThemeColors, theme: Theme, key: string): React.ReactNode {
  switch (t.type) {
    case "heading": {
      const sizes: Record<number, number> = { 1: 30, 2: 24, 3: 20, 4: 17, 5: 15, 6: 14 }
      return inlineBlock(t.tokens, c, {
        color: c.heading,
        fontWeight: 700,
        fontSize: sizes[t.depth] ?? 16,
        lineHeight: 1.3,
        marginTop: t.depth === 1 ? 0 : 20,
        marginBottom: 16,
      }, key)
    }
    case "paragraph":
      return inlineBlock(t.tokens, c, { marginBottom: 16 }, key)
    case "code":
      return renderCode(t, c, theme, key)
    case "list":
      return renderList(t, c, theme, key)
    case "table":
      return renderTable(t, c, key)
    case "blockquote":
      return h(
        "div",
        {
          key,
          style: {
            display: "flex",
            flexDirection: "column",
            color: c.muted,
            borderLeft: `4px solid ${c.quoteBorder}`,
            paddingLeft: 12,
            marginBottom: 16,
          },
        },
        ...(t.tokens ?? []).map((tok: any, i: number) => renderBlock(tok, c, theme, `${key}-${i}`)),
      )
    case "hr":
      return h("div", { key, style: { display: "flex", borderTop: `1px solid ${c.border}`, margin: "12px 0 24px" } })
    case "space":
      return null
    default:
      return t.text ? inlineBlock([{ type: "text", text: t.text }], c, { marginBottom: 16 }, key) : null
  }
}

export function buildDocument(
  markdown: string,
  theme: Theme,
  width: number,
  fixedHeight = true,
  colors: ThemeColors = THEME_COLORS[theme],
) {
  const c = colors
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        width: fixedHeight ? "100%" : width,
        height: fixedHeight ? "100%" : "auto",
        padding: "48px 56px",
        backgroundColor: fixedHeight ? "transparent" : c.bg,
        color: c.text,
        fontFamily: FONT_FAMILY,
        fontSize: 16,
        lineHeight: 1.6,
      },
    },
    ...marked.lexer(markdown).map((token: any, index: number) => renderBlock(token, c, theme, `${index}`)),
  )
}
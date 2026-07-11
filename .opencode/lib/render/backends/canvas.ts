import { createCanvas, GlobalFonts } from "@napi-rs/canvas"
import path from "path"
import { marked } from "marked"
import { THEME_COLORS } from "../css"
import { highlightRuns } from "../highlight"
import type { Renderer, Theme, ThemeColors } from "../types"

interface Run {
  text: string
  color: string
  bold: boolean
  italic: boolean
  mono: boolean
  inlineCode: boolean
}

type Op =
  | { type: "text"; x: number; y: number; text: string; color: string; font: string }
  | { type: "rect"; x: number; y: number; w: number; h: number; color: string; radius: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }

const SANS = '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif'
const MONO = 'Menlo, Consolas, "Liberation Mono", monospace'

const fontDir = path.resolve(import.meta.dir, "../../../node_modules/@fontsource/inter/files")
for (const [file, family] of [
  ["inter-latin-400-normal.woff2", "Inter"],
  ["inter-latin-400-italic.woff2", "Inter"],
  ["inter-latin-600-normal.woff2", "Inter"],
  ["inter-latin-700-normal.woff2", "Inter"],
] as const) {
  GlobalFonts.registerFromPath(path.join(fontDir, file), family)
}

function fontStr(r: Run, size: number): string {
  const style = r.italic ? "italic" : "normal"
  const weight = r.bold ? 700 : 400
  const fam = r.mono ? MONO : SANS
  return `${style} ${weight} ${size}px ${fam}`
}

function inlineRuns(tokens: any, inherited: Partial<Run>, c: ThemeColors): Run[] {
  const out: Run[] = []
  for (const t of tokens ?? []) {
    switch (t.type) {
      case "text":
        if (t.tokens?.length) out.push(...inlineRuns(t.tokens, inherited, c))
        else
          out.push({
            text: String(t.text ?? ""),
            color: inherited.color ?? c.text,
            bold: !!inherited.bold,
            italic: !!inherited.italic,
            mono: !!inherited.mono,
            inlineCode: !!inherited.inlineCode,
          })
        break
      case "strong":
        out.push(...inlineRuns(t.tokens, { ...inherited, bold: true }, c))
        break
      case "em":
        out.push(...inlineRuns(t.tokens, { ...inherited, italic: true }, c))
        break
      case "codespan":
        out.push({
          text: String(t.text ?? ""),
          color: c.inlineCodeText,
          bold: !!inherited.bold,
          italic: false,
          mono: true,
          inlineCode: true,
        })
        break
      case "link":
        out.push(...inlineRuns(t.tokens, { ...inherited, color: c.accent }, c))
        break
      case "br":
        out.push({ text: "\n", color: c.text, bold: false, italic: false, mono: false, inlineCode: false })
        break
      default:
        out.push({
          text: String(t.text ?? t.raw ?? ""),
          color: inherited.color ?? c.text,
          bold: !!inherited.bold,
          italic: !!inherited.italic,
          mono: !!inherited.mono,
          inlineCode: !!inherited.inlineCode,
        })
    }
  }
  return out
}

class Layout {
  ctx: CanvasRenderingContext2D
  ops: Op[] = []
  left: number
  right: number
  y: number
  width: number
  c: ThemeColors
  padTop: number
  dry: boolean
  constructor(ctx: CanvasRenderingContext2D, width: number, c: ThemeColors, pad = 56, padTop = 48) {
    this.ctx = ctx
    this.width = width
    this.c = c
    this.left = pad
    this.right = width - pad
    this.y = padTop
    this.padTop = padTop
    this.dry = false
  }
  get contentW() {
    return this.right - this.left
  }
}

function drawRichText(
  L: Layout,
  runs: Run[],
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  lineHeight: number,
  push: boolean,
): number {
  let cx = x
  let cy = y
  L.ctx.textBaseline = "top"
  for (const run of runs) {
    const segments = run.text.split("\n")
    for (let si = 0; si < segments.length; si++) {
      const seg = segments[si]
      L.ctx.font = fontStr(run, size)
      const tokens = run.inlineCode ? [seg] : seg.split(/(\s+)/)
      for (const tok of tokens) {
        if (tok === "") continue
        if (/^\s+$/.test(tok)) {
          if (cx === x) continue
          cx += L.ctx.measureText(tok).width
          if (cx > x + maxWidth) {
            cx = x
            cy += lineHeight
          }
        } else {
          const padding = run.inlineCode ? 5 : 0
          const w = L.ctx.measureText(tok).width + padding * 2
          if (!run.inlineCode && w > maxWidth) {
            for (const char of tok) {
              const charW = L.ctx.measureText(char).width
              if (cx + charW > x + maxWidth && cx > x) {
                cx = x
                cy += lineHeight
              }
              if (push) {
                L.ops.push({ type: "text", x: cx, y: cy, text: char, color: run.color, font: fontStr(run, size) })
              }
              cx += charW
            }
            continue
          }
          if (cx + w > x + maxWidth && cx > x) {
            cx = x
            cy += lineHeight
          }
          if (push) {
            if (run.inlineCode) {
              L.ops.push({
                type: "rect",
                x: cx,
                y: cy + 2,
                w,
                h: lineHeight - 4,
                color: L.c.inlineCodeBg,
                radius: 5,
              })
            }
            L.ops.push({ type: "text", x: cx + padding, y: cy, text: tok, color: run.color, font: fontStr(run, size) })
          }
          cx += w
        }
      }
      if (si < segments.length - 1) {
        cx = x
        cy += lineHeight
      }
    }
  }
  return cy + lineHeight
}

function renderBlockCanvas(L: Layout, t: any, theme: Theme) {
  const push = !L.dry
  const c = L.c
  switch (t.type) {
    case "heading": {
      const sizes: Record<number, number> = { 1: 30, 2: 24, 3: 20, 4: 17, 5: 15, 6: 14 }
      const size = sizes[t.depth] ?? 16
      const lineHeight = Math.ceil(size * 1.3)
      if (L.y > L.padTop) L.y += 20
      const runs = inlineRuns(t.tokens, { color: c.heading, bold: true }, c)
      L.y = drawRichText(L, runs, L.left, L.y, L.contentW, size, lineHeight, push)
      L.y += 8
      break
    }
    case "paragraph": {
      const runs = inlineRuns(t.tokens, { color: c.text }, c)
      L.y = drawRichText(L, runs, L.left, L.y, L.contentW, 16, 26, push)
      L.y += 12
      break
    }
    case "code": {
      const codeRuns: Run[] = highlightRuns(t.text, t.lang, theme, c.codeText, c.syntax).map((r) => ({
        text: r.text,
        color: r.color,
        bold: false,
        italic: false,
        mono: true,
        inlineCode: false,
      }))
      const padC = 16
      const innerX = L.left + padC
      const innerW = L.contentW - padC * 2
      const dryBefore = L.dry
      L.dry = true
      const endY = drawRichText(L, codeRuns, innerX, L.y + padC, innerW, 13, 20, false)
      L.dry = dryBefore
      const boxH = endY - L.y
      if (push) L.ops.push({ type: "rect", x: L.left, y: L.y, w: L.contentW, h: boxH, color: c.codeBg, radius: 8 })
      drawRichText(L, codeRuns, innerX, L.y + padC, innerW, 13, 20, push)
      L.y += boxH + 16
      break
    }
    case "blockquote": {
      const oldLeft = L.left
      L.left = oldLeft + 16
      const startY = L.y
      for (const tok of t.tokens ?? []) {
        const runs =
          tok.type === "paragraph"
            ? inlineRuns(tok.tokens, { color: c.muted }, c)
            : inlineRuns(tok.tokens ?? [{ type: "text", text: tok.text ?? "" }], { color: c.muted }, c)
        L.y = drawRichText(L, runs, L.left, L.y, L.contentW, 16, 26, push)
        L.y += 8
      }
      const h = L.y - startY
      if (push) {
        L.ops.push({ type: "rect", x: oldLeft, y: startY, w: 4, h, color: c.quoteBorder, radius: 2 })
      }
      L.left = oldLeft
      L.y += 8
      break
    }
    case "hr": {
      L.y += 12
      if (push) L.ops.push({ type: "line", x1: L.left, y1: L.y, x2: L.right, y2: L.y, color: c.border, width: 1 })
      L.y += 13
      break
    }
    case "list": {
      renderListCanvas(L, t, theme)
      L.y += 8
      break
    }
    case "table": {
      renderTableCanvas(L, t)
      L.y += 12
      break
    }
    case "space":
      L.y += 8
      break
    default: {
      const text = t.text ?? t.raw ?? ""
      if (text) {
        L.y = drawRichText(L, [{ text, color: c.text, bold: false, italic: false, mono: false, inlineCode: false }], L.left, L.y, L.contentW, 16, 26, push)
        L.y += 12
      }
    }
  }
}

function renderListCanvas(L: Layout, t: any, theme: Theme) {
  const push = !L.dry
  const c = L.c
  const markerX = L.left
  const indent = 24
  ;(t.items ?? []).forEach((item: any, i: number) => {
    const marker = t.ordered ? `${(t.start ?? 1) + i}.` : "•"
    const contentX = markerX + indent
    const oldLeft = L.left
    L.left = contentX
    const startY = L.y
    for (const tok of item.tokens ?? []) {
      if (tok.type === "list") {
        renderListCanvas(L, tok, theme)
      } else {
        const runs =
          tok.type === "text"
            ? inlineRuns(tok.tokens ?? [{ type: "text", text: tok.text ?? "" }], { color: c.text }, c)
            : inlineRuns(tok.tokens ?? [{ type: "text", text: tok.text ?? "" }], { color: c.text }, c)
        L.y = drawRichText(L, runs, contentX, L.y, L.right - contentX, 16, 26, push)
        L.y += 4
      }
    }
    L.left = oldLeft
    if (L.y === startY) L.y += 26
    if (push) {
      L.ops.push({
        type: "text",
        x: markerX,
        y: startY,
        text: marker,
        color: c.muted,
        font: `normal 400 16px ${SANS}`,
      })
    }
  })
}

function renderTableCanvas(L: Layout, t: any) {
  const push = !L.dry
  const c = L.c
  const headers = t.header ?? []
  const rows = t.rows ?? []
  const n = Math.max(1, headers.length, ...rows.map((row: any[]) => row.length))
  const startY = L.y

  const allRows = headers.length ? [headers, ...rows] : rows
  const preferred = Array.from({ length: n }, (_, ci) => {
    let widest = 0
    for (const row of allRows) {
      const runs = inlineRuns(row[ci]?.tokens ?? [], { color: c.text }, c)
      for (const run of runs) {
        L.ctx.font = fontStr(run, 14)
        widest = Math.max(widest, L.ctx.measureText(run.text).width)
      }
    }
    return Math.max(72, Math.min(widest + 28, L.contentW * 0.55))
  })
  const minimum = Math.min(96, L.contentW / n)
  const flexible = Math.max(0, L.contentW - minimum * n)
  const weightTotal = preferred.reduce((sum, width) => sum + width, 0)
  const colWidths = preferred.map((width) => minimum + (flexible * width) / weightTotal)

  let rowY = startY
  const drawRow = (cells: any[], bold: boolean, bg: boolean) => {
    let rowHeight = 38
    let cx = L.left
    const cellRuns = colWidths.map((width, ci) => {
      const runs = inlineRuns(cells[ci]?.tokens ?? [], { color: bold ? c.heading : c.text, bold }, c)
      const endY = drawRichText(L, runs, cx + 12, rowY + 9, width - 24, 14, 21, false)
      rowHeight = Math.max(rowHeight, endY - rowY + 8)
      cx += width
      return runs
    })
    if (push && bg) L.ops.push({ type: "rect", x: L.left, y: rowY, w: L.contentW, h: rowHeight, color: c.codeBg, radius: 0 })
    cx = L.left
    cellRuns.forEach((runs, ci) => {
      drawRichText(L, runs, cx + 12, rowY + 9, colWidths[ci] - 24, 14, 21, push)
      cx += colWidths[ci]
    })
    if (push) {
      L.ops.push({ type: "line", x1: L.left, y1: rowY, x2: L.right, y2: rowY, color: c.border, width: 1 })
    }
    rowY += rowHeight
  }

  if (headers.length) drawRow(headers, true, true)
  rows.forEach((r) => drawRow(r, false, false))
  if (push && (headers.length || rows.length)) {
    L.ops.push({ type: "line", x1: L.left, y1: rowY, x2: L.right, y2: rowY, color: c.border, width: 1 })
    let cx = L.left
    for (let ci = 0; ci <= n; ci++) {
      L.ops.push({ type: "line", x1: cx, y1: startY, x2: cx, y2: rowY, color: c.border, width: 1 })
      cx += colWidths[ci] ?? 0
    }
  }
  L.y = rowY
}

function fillRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  if (r <= 0) {
    ctx.fillRect(x, y, w, h)
    return
  }
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
  ctx.fill()
}

export const CanvasRenderer: Renderer = {
  name: "canvas",
  async render(markdown, options) {
    const theme: Theme = options.theme
    const c = options.colors ?? THEME_COLORS[theme]
    const tokens = marked.lexer(markdown)

    const measureCanvas = createCanvas(options.width, 10)
    const mL = new Layout(measureCanvas.getContext("2d"), options.width, c)
    mL.dry = true
    for (const t of tokens) renderBlockCanvas(mL, t, theme)
    const totalH = Math.ceil(mL.y + 48)

    const canvas = createCanvas(options.width, totalH)
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = c.bg
    ctx.fillRect(0, 0, options.width, totalH)

    const L = new Layout(ctx, options.width, c)
    for (const t of tokens) renderBlockCanvas(L, t, theme)

    for (const op of L.ops) {
      if (op.type === "text") {
        if (op.color === "transparent") continue
        ctx.font = op.font
        ctx.fillStyle = op.color
        ctx.textBaseline = "top"
        ctx.fillText(op.text, op.x, op.y)
      } else if (op.type === "rect") {
        if (op.color === "transparent") continue
        ctx.fillStyle = op.color
        fillRoundRect(ctx, op.x, op.y, op.w, op.h, op.radius)
      } else {
        ctx.strokeStyle = op.color
        ctx.lineWidth = op.width
        ctx.beginPath()
        ctx.moveTo(op.x1, op.y1)
        ctx.lineTo(op.x2, op.y2)
        ctx.stroke()
      }
    }

    const png = canvas.toBuffer("image/png")
    return { backend: this.name, png: new Uint8Array(png) }
  },
}

import { createCanvas } from "@napi-rs/canvas"
import { marked } from "marked"
import { THEME_COLORS } from "../css"
import { highlightRuns } from "../highlight"
import { CSS_FONT_FAMILY, registerCanvasFonts } from "../fonts"
import type { Renderer, Theme, ThemeColors } from "../types"

interface Run {
  text: string
  color: string
  bold: boolean
  italic: boolean
  inlineCode: boolean
}

type Op =
  | { type: "text"; x: number; y: number; text: string; color: string; font: string }
  | { type: "rect"; x: number; y: number; w: number; h: number; color: string; radius: number }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; color: string; width: number }

registerCanvasFonts()

function fontStr(r: Run, size: number): string {
  const style = r.italic ? "italic" : "normal"
  const weight = r.bold ? 700 : 400
  return `${style} ${weight} ${size}px ${CSS_FONT_FAMILY}`
}

const metricsCache = new Map<string, { ascent: number; descent: number }>()

function fm(ctx: CanvasRenderingContext2D, font: string) {
  let r = metricsCache.get(font)
  if (!r) {
    ctx.font = font
    const m = ctx.measureText("Hy")
    r = { ascent: m.fontBoundingBoxAscent, descent: m.fontBoundingBoxDescent }
    metricsCache.set(font, r)
  }
  return r
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
          inlineCode: true,
        })
        break
      case "link":
        out.push(...inlineRuns(t.tokens, { ...inherited, color: c.accent }, c))
        break
      case "br":
        break
      default:
        out.push({
          text: String(t.text ?? t.raw ?? ""),
          color: inherited.color ?? c.text,
          bold: !!inherited.bold,
          italic: !!inherited.italic,
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
  const refFont = runs.length > 0 ? fontStr(runs[0], size) : `normal 400 ${size}px ${CSS_FONT_FAMILY}`
  const m = fm(L.ctx, refFont)
  const bl = m.ascent + Math.floor((lineHeight - m.ascent - m.descent) / 2)
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
                L.ops.push({ type: "text", x: cx, y: cy + bl, text: char, color: run.color, font: fontStr(run, size) })
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
                y: cy + bl - m.ascent,
                w,
                h: m.ascent + m.descent,
                color: L.c.inlineCodeBg,
                radius: 5,
              })
            }
            L.ops.push({ type: "text", x: cx + padding, y: cy + bl, text: tok, color: run.color, font: fontStr(run, size) })
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
      const codeRuns: Run[] = highlightRuns(t.text, t.lang, c.codeText, c.syntax).map((r) => ({
        text: r.text,
        color: r.color,
        bold: false,
        italic: false,
        inlineCode: false,
      }))
      const padC = 16
      const innerX = L.left + padC
      const innerW = L.contentW - padC * 2
      const dryBefore = L.dry
      L.dry = true
      const endY = drawRichText(L, codeRuns, innerX, L.y + padC, innerW, 13, 20, false)
      L.dry = dryBefore
      const boxH = endY - L.y + padC
      if (push) L.ops.push({ type: "rect", x: L.left, y: L.y, w: L.contentW, h: boxH, color: c.codeBg, radius: 8 })
      drawRichText(L, codeRuns, innerX, L.y + padC, innerW, 13, 20, push)
      L.y += boxH + 16
      break
    }
    case "blockquote": {
      const oldLeft = L.left
      L.left = oldLeft + 16
      const startY = L.y
      const toks = t.tokens ?? []
      for (let i = 0; i < toks.length; i++) {
        const runs =
          toks[i].type === "paragraph"
            ? inlineRuns(toks[i].tokens, { color: c.muted }, c)
            : inlineRuns(toks[i].tokens ?? [{ type: "text", text: toks[i].text ?? "" }], { color: c.muted }, c)
        L.y = drawRichText(L, runs, L.left, L.y, L.contentW, 16, 26, push)
        if (i < toks.length - 1) L.y += 8
      }
      const h = L.y - startY + 4
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
  const markerFont = `normal 400 16px ${CSS_FONT_FAMILY}`
  const markerM = fm(L.ctx, markerFont)
  const markerBl = markerM.ascent + Math.floor((26 - markerM.ascent - markerM.descent) / 2)
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
        const runs = inlineRuns(tok.tokens ?? [{ type: "text", text: tok.text ?? "" }], { color: c.text }, c)
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
        y: startY + markerBl,
        text: marker,
        color: c.muted,
        font: markerFont,
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

  const tableFont = `normal 400 14px ${CSS_FONT_FAMILY}`
  const tm = fm(L.ctx, tableFont)
  const cellLineH = Math.ceil((tm.ascent + tm.descent) * 1.5)
  const cellPadY = 7
  const minRowH = tm.ascent + tm.descent + cellPadY * 2

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
    let rowHeight = minRowH
    let cx = L.left
    const cellRuns = colWidths.map((width, ci) => {
      const runs = inlineRuns(cells[ci]?.tokens ?? [], { color: bold ? c.heading : c.text, bold }, c)
      const endY = drawRichText(L, runs, cx + 12, rowY + cellPadY, width - 24, 14, cellLineH, false)
      rowHeight = Math.max(rowHeight, endY - rowY + cellPadY)
      cx += width
      return runs
    })
    if (push && bg) L.ops.push({ type: "rect", x: L.left, y: rowY, w: L.contentW, h: rowHeight, color: c.codeBg, radius: 0 })
    cx = L.left
    cellRuns.forEach((runs, ci) => {
      drawRichText(L, runs, cx + 12, rowY + cellPadY, colWidths[ci] - 24, 14, cellLineH, push)
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
    const scale = options.scale ?? 2
    const tokens = marked.lexer(markdown)

    const measureCanvas = createCanvas(options.width, 10)
    const mL = new Layout(measureCanvas.getContext("2d"), options.width, c)
    mL.dry = true
    for (const t of tokens) renderBlockCanvas(mL, t, theme)
    const totalH = Math.ceil(mL.y + 48)

    const canvas = createCanvas(options.width * scale, totalH * scale)
    const ctx = canvas.getContext("2d")
    ctx.scale(scale, scale)
    ctx.fillStyle = c.bg
    ctx.fillRect(0, 0, options.width, totalH)

    const L = new Layout(ctx, options.width, c)
    for (const t of tokens) renderBlockCanvas(L, t, theme)

    ctx.textBaseline = "alphabetic"
    for (const op of L.ops) {
      if (op.type === "text") {
        if (op.color === "transparent") continue
        ctx.font = op.font
        ctx.fillStyle = op.color
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
    return { png: new Uint8Array(png) }
  },
}

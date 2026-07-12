import sharp from "sharp"
import satori from "satori"
import { THEME_COLORS } from "../css"
import { buildDocument } from "../jsx"
import { loadFonts } from "../fonts"
import type { Renderer } from "../types"

export const SatoriRenderer: Renderer = {
  async render(markdown, options) {
    if (options.width < 640) {
      throw new Error("satori backend: widths below 640px are not supported")
    }
    const scale = options.scale ?? 2
    const fonts = await loadFonts()
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const svg = await satori(
      buildDocument(markdown, options.theme, options.width, colors),
      { width: options.width, fonts },
    )
    const buf = await sharp(Buffer.from(svg), { density: 72 * scale }).png().toBuffer()
    return { png: new Uint8Array(buf) }
  },
}

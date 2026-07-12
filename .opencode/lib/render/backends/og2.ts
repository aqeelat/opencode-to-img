import { ImageResponse } from "@vercel/og"
import sharp from "sharp"
import { THEME_COLORS } from "../css"
import { buildDocument, buildScaledDocument } from "../jsx"
import { loadFonts } from "../fonts"
import type { Renderer } from "../types"

export const Og2Renderer: Renderer = {
  name: "og2",
  async render(markdown, options) {
    const scale = options.scale ?? 2
    const fonts = await loadFonts()
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const pixelWidth = options.width * scale
    const response = new ImageResponse(
      buildScaledDocument(markdown, options.theme, options.width, scale, 16384, colors),
      { width: pixelWidth, height: 16384, fonts },
    )
    const buf = await sharp(Buffer.from(await response.arrayBuffer()))
      .trim({ threshold: 1 })
      .png()
      .toBuffer()
    return { png: new Uint8Array(buf) }
  },
}

import sharp from "sharp"
import satori from "satori"
import { THEME_COLORS } from "../css"
import { buildDocument } from "../jsx"
import { loadFonts } from "../fonts"
import { renderAndCrop } from "../raster"
import type { Renderer } from "../types"

export const SatoriRenderer: Renderer = {
  name: "satori",
  async render(markdown, options) {
    if (options.width < 640) {
      throw new Error("satori backend: widths below 640px are not supported; use canvas, og, takumi, or a browser backend")
    }
    const scale = options.scale ?? 2
    const fonts = await loadFonts()
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const pixelWidth = options.width * scale
    const png = await renderAndCrop(pixelWidth, colors.bg, async (pixelHeight) => {
      const svg = await satori(
        buildDocument(markdown, options.theme, options.width, true, colors),
        { width: options.width, height: Math.ceil(pixelHeight / scale), fonts },
      )
      const buf = await sharp(Buffer.from(svg), { density: 72 * scale }).png().toBuffer()
      return new Uint8Array(buf)
    })
    return { png }
  },
}

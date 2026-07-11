import { ImageResponse } from "@vercel/og"
import { THEME_COLORS } from "../css"
import { buildScaledDocument, loadFonts } from "../jsx"
import { renderAndCrop } from "../raster"
import type { Renderer } from "../types"

export const OgRenderer: Renderer = {
  name: "og",
  async render(markdown, options) {
    const scale = options.scale ?? 2
    const fonts = await loadFonts()
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const pixelWidth = options.width * scale
    const png = await renderAndCrop(pixelWidth, colors.bg, async (pixelHeight) => {
      const response = new ImageResponse(
        buildScaledDocument(markdown, options.theme, options.width, scale, pixelHeight, colors),
        { width: pixelWidth, height: pixelHeight, fonts },
      )
      return new Uint8Array(await response.arrayBuffer())
    })
    return { backend: this.name, png }
  },
}

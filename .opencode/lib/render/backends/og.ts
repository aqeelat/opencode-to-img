import { ImageResponse } from "@vercel/og"
import { THEME_COLORS } from "../css"
import { buildDocument, loadFonts } from "../jsx"
import { renderAndCrop } from "../raster"
import type { Renderer } from "../types"

export const OgRenderer: Renderer = {
  name: "og",
  async render(markdown, options) {
    const fonts = await loadFonts()
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const png = await renderAndCrop(options.width, colors.bg, async (height) => {
      const response = new ImageResponse(buildDocument(markdown, options.theme, options.width, true, colors), {
        width: options.width,
        height,
        fonts,
      })
      return new Uint8Array(await response.arrayBuffer())
    })
    return { backend: this.name, png }
  },
}

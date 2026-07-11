import { Resvg } from "@resvg/resvg-js"
import satori from "satori"
import { THEME_COLORS } from "../css"
import { buildDocument, loadFonts } from "../jsx"
import { renderAndCrop } from "../raster"
import type { Renderer } from "../types"

export const SatoriRenderer: Renderer = {
  name: "satori",
  async render(markdown, options) {
    if (options.width < 640) {
      throw new Error("satori backend: widths below 640px are not supported; use canvas, og, takumi, or a browser backend")
    }
    const fonts = await loadFonts()
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const png = await renderAndCrop(options.width, colors.bg, async (height) => {
      const svg = await satori(buildDocument(markdown, options.theme, options.width, true, colors), {
        width: options.width,
        height,
        fonts,
      })
      return new Uint8Array(new Resvg(svg).render().asPng())
    })
    return { backend: this.name, png }
  },
}

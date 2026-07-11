import { render } from "takumi-js"
import { THEME_COLORS } from "../css"
import { buildScaledDocument } from "../jsx"
import { renderAndCrop } from "../raster"
import type { Renderer } from "../types"

export const TakumiRenderer: Renderer = {
  name: "takumi",
  async render(markdown, options) {
    const scale = options.scale ?? 2
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const pixelWidth = options.width * scale
    const png = await renderAndCrop(pixelWidth, colors.bg, async (pixelHeight) => {
      const buf = await render(
        buildScaledDocument(markdown, options.theme, options.width, scale, pixelHeight, colors),
        { width: pixelWidth, height: pixelHeight, format: "png" },
      )
      return new Uint8Array(buf)
    })
    return { backend: this.name, png }
  },
}

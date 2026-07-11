import { render } from "takumi-js"
import { buildDocument } from "../jsx"
import type { Renderer } from "../types"

export const TakumiRenderer: Renderer = {
  name: "takumi",
  async render(markdown, options) {
    const png = await render(buildDocument(markdown, options.theme, options.width, false, options.colors), {
      width: options.width,
      format: "png",
    })
    return { backend: this.name, png: new Uint8Array(png) }
  },
}

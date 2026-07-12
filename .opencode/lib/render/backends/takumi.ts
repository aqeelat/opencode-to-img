import { Renderer } from "takumi-js/node"
import { fromJsx } from "takumi-js/helpers/jsx"
import { THEME_COLORS } from "../css"
import { buildDocument } from "../jsx"
import { loadFonts } from "../fonts"
import type { Renderer as IRenderer } from "../types"

export const TakumiRenderer: IRenderer = {
  name: "takumi",
  async render(markdown, options) {
    const scale = options.scale ?? 2
    const colors = options.colors ?? THEME_COLORS[options.theme]
    const fonts = await loadFonts()
    const renderer = new Renderer()
    for (const font of fonts) await renderer.registerFont(font)

    const element = buildDocument(markdown, options.theme, options.width, false, colors)
    const { node, stylesheets } = await fromJsx(element)
    const buf = await renderer.render(node, {
      width: options.width * scale,
      devicePixelRatio: scale,
      stylesheets,
      format: "png",
    })

    return { png: new Uint8Array(buf) }
  },
}

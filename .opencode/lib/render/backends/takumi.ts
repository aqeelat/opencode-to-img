import { Renderer } from "takumi-js/node"
import { fromJsx } from "takumi-js/helpers/jsx"
import { THEME_COLORS } from "../css"
import { buildDocument, buildScaledDocument } from "../jsx"
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
    const measured = await renderer.measure(node, { width: options.width, stylesheets })
    const contentHeight = Math.ceil(measured.height)

    const pixelWidth = options.width * scale
    const pixelHeight = contentHeight * scale
    const scaled = buildScaledDocument(markdown, options.theme, options.width, scale, pixelHeight, colors)
    const { node: scaledNode, stylesheets: scaledStylesheets } = await fromJsx(scaled)
    const buf = await renderer.render(scaledNode, {
      width: pixelWidth,
      height: pixelHeight,
      stylesheets: scaledStylesheets,
      format: "png",
    })

    return { png: new Uint8Array(buf) }
  },
}

import path from "path"
import { GlobalFonts } from "@napi-rs/canvas"

export const FONT_FAMILY = "JetBrains Mono"
const FONT_DIR = path.resolve(import.meta.dir, "../../assets/fonts")

const FONT_FILES = [
  ["JetBrainsMono-Regular.ttf", 400, "normal"],
  ["JetBrainsMono-Italic.ttf", 400, "italic"],
  ["JetBrainsMono-Bold.ttf", 700, "normal"],
] as const

export async function loadFonts() {
  return Promise.all(
    FONT_FILES.map(async ([file, weight, style]) => ({
      name: FONT_FAMILY,
      data: await Bun.file(path.join(FONT_DIR, file)).arrayBuffer(),
      weight,
      style,
    })),
  )
}

export function registerCanvasFonts() {
  for (const [file] of FONT_FILES) {
    GlobalFonts.registerFromPath(path.join(FONT_DIR, file), FONT_FAMILY)
  }
}

export const CSS_FONT_FAMILY = `"${FONT_FAMILY}", "SFMono-Regular", Menlo, Consolas, monospace`

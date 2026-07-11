import type { Renderer } from "./types"

export const BACKENDS = ["canvas", "og", "satori", "takumi", "chrome", "firefox"] as const
export type BackendName = (typeof BACKENDS)[number]

export async function getRenderer(name: string): Promise<Renderer> {
  switch (name) {
    case "canvas": {
      const m = await import("./backends/canvas")
      return m.CanvasRenderer
    }
    case "og": {
      const m = await import("./backends/og")
      return m.OgRenderer
    }
    case "satori": {
      const m = await import("./backends/satori")
      return m.SatoriRenderer
    }
    case "takumi": {
      const m = await import("./backends/takumi")
      return m.TakumiRenderer
    }
    case "chrome": {
      const m = await import("./backends/chrome")
      return m.ChromeRenderer
    }
    case "firefox": {
      const m = await import("./backends/firefox")
      return m.FirefoxRenderer
    }
    default:
      throw new Error(
        `Unknown renderer '${name}'. Available: ${[...BACKENDS, "all"].join(", ")}`,
      )
  }
}

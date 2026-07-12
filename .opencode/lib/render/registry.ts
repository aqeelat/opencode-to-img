import type { Renderer } from "./types"

export const BACKENDS = ["canvas", "satori", "takumi"] as const
export type BackendName = (typeof BACKENDS)[number]

export async function getRenderer(name: string): Promise<Renderer> {
  switch (name) {
    case "canvas": {
      const m = await import("./backends/canvas")
      return m.CanvasRenderer
    }
    case "satori": {
      const m = await import("./backends/satori")
      return m.SatoriRenderer
    }
    case "takumi": {
      const m = await import("./backends/takumi")
      return m.TakumiRenderer
    }
    default:
      throw new Error(
        `Unknown renderer '${name}'. Available: ${[...BACKENDS, "all"].join(", ")}`,
      )
  }
}

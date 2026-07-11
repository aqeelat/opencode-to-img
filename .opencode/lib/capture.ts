import path from "path"
import { getRenderer, listBackends } from "./render/registry"
import type { BackendName } from "./render/registry"
import type { RenderOptions } from "./render/types"

export type CaptureBackend = BackendName | "all"

export interface CaptureRequest extends RenderOptions {
  markdown: string
  backend: CaptureBackend
  outputDir: string
}

export interface CaptureResult {
  files: string[]
  failures: Array<{ backend: string; message: string }>
}

function timestamp(): string {
  const date = new Date()
  const pad = (value: number) => String(value).padStart(2, "0")
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
}

export async function captureMarkdown(request: CaptureRequest): Promise<CaptureResult> {
  const targets = request.backend === "all" ? [...listBackends()] : [request.backend]
  const files: string[] = []
  const failures: CaptureResult["failures"] = []
  const suffix = timestamp()

  for (const backend of targets) {
    try {
      const renderer = await getRenderer(backend)
      const { png } = await renderer.render(request.markdown, {
        theme: request.theme,
        width: request.width,
        scale: request.scale,
        colors: request.colors,
      })
      const file = path.join(request.outputDir, `response-${suffix}-${backend}.png`)
      await Bun.write(file, png)
      files.push(file)
    } catch (error) {
      failures.push({
        backend,
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return { files, failures }
}

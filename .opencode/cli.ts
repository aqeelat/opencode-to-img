import path from "path"
import { getRenderer, listBackends, type BackendName } from "./lib/render/registry"

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`
  const eq = `${flag}=`
  const a = process.argv.find((a) => a === flag || a.startsWith(eq))
  if (!a) return fallback
  return a === flag ? process.argv[process.argv.indexOf(a) + 1] : a.slice(eq.length)
}

async function main() {
  const file = arg("file")
  if (!file) {
    console.error("Usage: bun cli.ts --file=<path> [--theme=dark] [--generator=all] [--label=before] [--width=1000] [--output=benchmark]")
    process.exit(1)
  }

  const theme = (arg("theme", "dark") as "dark" | "light")
  const generator = arg("generator", "all")
  const label = arg("label", "response")
  const width = Number(arg("width", "1000"))
  const scale = Number(arg("scale", "2"))
  const outputDir = arg("output", "benchmark")

  const targets: BackendName[] = generator === "all" ? [...listBackends()] : [generator as BackendName]
  const markdown = await Bun.file(file).text()

  for (const backend of targets) {
    const start = performance.now()
    const memBefore = process.memoryUsage().rss
    try {
      const renderer = await getRenderer(backend)
      const { png } = await renderer.render(markdown, { theme, width, scale })
      const ms = Math.round(performance.now() - start)
      const memAfter = process.memoryUsage().rss
      const memDelta = Math.round((memAfter - memBefore) / 1024 / 1024)
      const file = path.join(outputDir, `${backend}-${label}.png`)
      await Bun.write(file, png)
      console.log(`${backend}\t${ms}ms\t+${memDelta}MB\t${file}`)
    } catch (e) {
      const ms = Math.round(performance.now() - start)
      console.error(`${backend}\t${ms}ms\tFAILED\t${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

main()

import path from "path"
import { getRenderer, BACKENDS } from "./lib/render/registry"

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`
  const eq = `${flag}=`
  const a = process.argv.find((a) => a === flag || a.startsWith(eq))
  if (!a) return fallback
  return a === flag ? process.argv[process.argv.indexOf(a) + 1] : a.slice(eq.length)
}

async function main() {
  const file = arg("file", "../benchmark/sample.md")
  const label = arg("label", "response")
  const theme = arg("theme", "dark") as "dark" | "light"
  const width = Number(arg("width", "1000"))
  const scale = Number(arg("scale", "2"))
  const outputDir = arg("output", "benchmark")

  const markdown = await Bun.file(file).text()

  for (const backend of BACKENDS) {
    const start = performance.now()
    const memBefore = process.memoryUsage().rss
    try {
      const renderer = await getRenderer(backend)
      const { png } = await renderer.render(markdown, { theme, width, scale })
      const ms = Math.round(performance.now() - start)
      const memDelta = Math.round((process.memoryUsage().rss - memBefore) / 1024 / 1024)
      const out = path.join(outputDir, `${label}-${backend}.png`)
      await Bun.write(out, png)
      console.log(`${backend}\t${ms}ms\t+${memDelta}MB\t${out}`)
    } catch (e) {
      const ms = Math.round(performance.now() - start)
      console.error(`${backend}\t${ms}ms\tFAILED\t${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

main()

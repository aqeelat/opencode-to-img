import path from "path"
import { getRenderer, BACKENDS, type BackendName } from "./lib/render/registry"

function arg(name: string, fallback?: string): string | undefined {
  const flag = `--${name}`
  const eq = `${flag}=`
  const a = process.argv.find((a) => a === flag || a.startsWith(eq))
  if (!a) return fallback
  return a === flag ? process.argv[process.argv.indexOf(a) + 1] : a.slice(eq.length)
}

const HELP = `opencode-to-img — render markdown to PNG

Usage:
  bun cli.ts --file=<path> [options]
  cat file.md | bun cli.ts [options]

Options:
  --file=<path>        Markdown file (reads from stdin if omitted)
  --output=<path>      Output PNG path (single backend only)
  --output-dir=<dir>   Output directory for PNGs (default: .)
  --generator=<name>   canvas | og | satori | takumi | chrome | firefox | all (default: canvas)
  --theme=<name>       dark | light (default: dark)
  --width=<px>         Logical width (default: 1000)
  --scale=<n>          Pixel scale factor (default: 2)
  --help               Show this help`

async function main() {
  if (arg("help") !== undefined || arg("h") !== undefined) {
    console.log(HELP)
    return
  }

  const file = arg("file")
  const output = arg("output")
  const outputDir = arg("output-dir", ".")
  const theme = (arg("theme", "dark") as "dark" | "light")
  const generator = arg("generator", "canvas")
  const width = Number(arg("width", "1000"))
  const scale = Number(arg("scale", "2"))

  if (output && generator === "all") {
    console.error("--output cannot be used with --generator=all (use --output-dir)")
    process.exit(1)
  }

  const markdown = file ? await Bun.file(file).text() : await Bun.stdin.text()

  const targets: BackendName[] = generator === "all" ? [...BACKENDS] : [generator as BackendName]

  for (const backend of targets) {
    try {
      const renderer = await getRenderer(backend)
      const { png } = await renderer.render(markdown, { theme, width, scale })
      const outPath = output ?? path.join(outputDir, `${backend}.png`)
      await Bun.write(outPath, png)
      console.log(`${backend} → ${outPath}`)
    } catch (e) {
      console.error(`${backend}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}

main()

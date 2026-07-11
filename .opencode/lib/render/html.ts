import { Marked } from "marked"
import { markedHighlight } from "marked-highlight"
import hljs from "highlight.js"
import { hljsCss, themeCss } from "./css"
import { THEME_COLORS } from "./css"
import type { Theme, ThemeColors } from "./types"

const instance = new Marked(
  markedHighlight({
    langPrefix: "hljs language-",
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : "plaintext"
      return hljs.highlight(code, { language }).value
    },
  }),
  { gfm: true, breaks: false },
)

export function markdownToHtml(markdown: string, theme: Theme, colors: ThemeColors = THEME_COLORS[theme]): string {
  const body = instance.parse(markdown) as string
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${hljsCss(theme, colors)}
${themeCss(theme, colors)}
</style>
</head>
<body>
<div class="markdown-body">
${body}
</div>
</body>
</html>`
}

import type { Theme, ThemeColors } from "./types"

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  light: {
    bg: "#ffffff",
    text: "#1f2328",
    heading: "#1f2328",
    codeBg: "#f6f8fa",
    codeText: "#1f2328",
    inlineCodeBg: "rgba(175, 184, 193, 0.2)",
    inlineCodeText: "#1f2328",
    border: "#d0d7de",
    accent: "#0969da",
    muted: "#656d76",
    quoteBorder: "#d0d7de",
    syntax: {
      comment: "#6a737d",
      keyword: "#cf222e",
      function: "#8250df",
      variable: "#953800",
      string: "#0a3069",
      number: "#0550ae",
      type: "#cf222e",
      operator: "#0550ae",
      punctuation: "#1f2328",
    },
  },
  dark: {
    bg: "#0d1117",
    text: "#c9d1d9",
    heading: "#f0f6fc",
    codeBg: "#161b22",
    codeText: "#c9d1d9",
    inlineCodeBg: "rgba(110, 118, 129, 0.4)",
    inlineCodeText: "#c9d1d9",
    border: "#30363d",
    accent: "#58a6ff",
    muted: "#8b949e",
    quoteBorder: "#30363d",
    syntax: {
      comment: "#8b949e",
      keyword: "#ff7b72",
      function: "#d2a8ff",
      variable: "#ffa657",
      string: "#a5d6ff",
      number: "#79c0ff",
      type: "#ff7b72",
      operator: "#79c0ff",
      punctuation: "#c9d1d9",
    },
  },
}

export function hljsCss(theme: Theme, colors = THEME_COLORS[theme]): string {
  const s = colors.syntax
  return `
    .hljs { color: ${colors.codeText}; }
    .hljs-comment, .hljs-quote, .hljs-doctag, .hljs-meta { color: ${s.comment}; font-style: italic; }
    .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-name { color: ${s.keyword}; }
    .hljs-type, .hljs-class .hljs-title { color: ${s.type}; }
    .hljs-string, .hljs-meta-string, .hljs-regexp, .hljs-addition { color: ${s.string}; }
    .hljs-number, .hljs-symbol, .hljs-bullet, .hljs-attr, .hljs-attribute { color: ${s.number}; }
    .hljs-title, .hljs-section, .hljs-title.function_ { color: ${s.function}; }
    .hljs-built_in, .hljs-variable, .hljs-template-variable { color: ${s.variable}; }
    .hljs-operator, .hljs-property { color: ${s.operator}; }
    .hljs-punctuation { color: ${s.punctuation}; }
    .hljs-tag { color: ${s.type}; }
    .hljs-deletion { color: ${s.keyword}; }
    .hljs-emphasis { font-style: italic; }
    .hljs-strong { font-weight: 700; }
  `
}

export function themeCss(theme: Theme, colors = THEME_COLORS[theme]): string {
  const c = colors
  return `
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      background: ${c.bg};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", Helvetica, Arial, sans-serif;
      color: ${c.text};
      -webkit-font-smoothing: antialiased;
    }
    .markdown-body {
      padding: 48px 56px;
      font-size: 16px;
      line-height: 1.6;
      word-wrap: break-word;
    }
    .markdown-body > *:first-child { margin-top: 0; }
    .markdown-body > *:last-child { margin-bottom: 0; }
    .markdown-body h1, .markdown-body h2, .markdown-body h3,
    .markdown-body h4, .markdown-body h5, .markdown-body h6 {
      margin: 24px 0 16px;
      font-weight: 600;
      line-height: 1.25;
      color: ${c.heading};
    }
    .markdown-body h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid ${c.border}; }
    .markdown-body h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid ${c.border}; }
    .markdown-body h3 { font-size: 1.25em; }
    .markdown-body h4 { font-size: 1em; }
    .markdown-body h5 { font-size: 0.875em; }
    .markdown-body h6 { font-size: 0.85em; color: ${c.muted}; }
    .markdown-body p { margin: 0 0 16px; }
    .markdown-body a { color: ${c.accent}; text-decoration: none; }
    .markdown-body a:hover { text-decoration: underline; }
    .markdown-body strong { font-weight: 600; }
    .markdown-body ul, .markdown-body ol { margin: 0 0 16px; padding-left: 2em; }
    .markdown-body li { margin: 4px 0; }
    .markdown-body li > ul, .markdown-body li > ol { margin: 4px 0; }
    .markdown-body blockquote {
      margin: 0 0 16px;
      padding: 0 1em;
      color: ${c.muted};
      border-left: 0.25em solid ${c.quoteBorder};
    }
    .markdown-body hr { height: 1px; margin: 24px 0; border: 0; background: ${c.border}; }
    .markdown-body code {
      padding: 0.2em 0.4em;
      margin: 0;
      font-size: 85%;
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      color: ${c.inlineCodeText};
      background-color: ${c.inlineCodeBg};
      border-radius: 6px;
    }
    .markdown-body pre {
      margin: 0 0 16px;
      padding: 16px;
      overflow: auto;
      line-height: 1.45;
      background-color: ${c.codeBg};
      border-radius: 8px;
    }
    .markdown-body pre code {
      padding: 0;
      margin: 0;
      font-size: 100%;
      background: transparent;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .markdown-body table {
      display: block;
      width: 100%;
      margin: 0 0 16px;
      overflow: auto;
      border-spacing: 0;
      border-collapse: collapse;
    }
    .markdown-body table th, .markdown-body table td {
      padding: 6px 13px;
      border: 1px solid ${c.border};
    }
    .markdown-body table tr { background: ${c.bg}; }
    .markdown-body table tr:nth-child(2n) { background: ${c.codeBg}; }
    .markdown-body img { max-width: 100%; }
  `
}

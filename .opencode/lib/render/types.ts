export type Theme = "light" | "dark"

export interface RenderOptions {
  theme: Theme
  width: number
  colors?: ThemeColors
}

export interface RenderResult {
  backend: string
  png: Uint8Array
}

export interface Renderer {
  name: string
  render(markdown: string, options: RenderOptions): Promise<RenderResult>
}

export interface ThemeColors {
  bg: string
  text: string
  heading: string
  codeBg: string
  codeText: string
  inlineCodeBg: string
  inlineCodeText: string
  border: string
  accent: string
  muted: string
  quoteBorder: string
  syntax: SyntaxColors
}

export interface SyntaxColors {
  comment: string
  keyword: string
  function: string
  variable: string
  string: string
  number: string
  type: string
  operator: string
  punctuation: string
}

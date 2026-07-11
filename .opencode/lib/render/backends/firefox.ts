import { existsSync } from "fs"
import puppeteer from "puppeteer-core"
import { markdownToHtml } from "../html"
import type { Renderer } from "../types"

function findFirefox(): string {
  const candidates = [
    "/Applications/Firefox.app/Contents/MacOS/firefox",
    "/Applications/Firefox Developer Edition.app/Contents/MacOS/firefox",
    "/usr/bin/firefox",
    "/usr/local/bin/firefox",
  ]
  const executable = candidates.find(existsSync)
  if (!executable) {
    throw new Error("firefox backend: no system Firefox found. Use another backend or install Firefox.")
  }
  return executable
}

export const FirefoxRenderer: Renderer = {
  name: "firefox",
  async render(markdown, options) {
    const browser = await puppeteer.launch({
      browser: "firefox",
      executablePath: findFirefox(),
      headless: true,
      defaultViewport: null,
      args: ["--width", String(options.width), "--height", "800"],
    })
    try {
      const page = await browser.newPage()
      await page.setDefaultNavigationTimeout(60000)
      await page.setContent(markdownToHtml(markdown, options.theme, options.colors), { waitUntil: "load" })
      const document = await page.$(".markdown-body")
      if (!document) throw new Error("firefox backend: rendered document was not found")
      const png = await document.screenshot({ type: "png" })
      return { backend: this.name, png: new Uint8Array(png as Uint8Array) }
    } finally {
      await browser.close()
    }
  },
}

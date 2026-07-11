import puppeteer from "puppeteer-core"
import { existsSync } from "fs"
import { markdownToHtml } from "../html"
import type { Renderer } from "../types"

function findBrowser(): string {
  const candidates = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    "/Applications/Microsoft Edge.app/Contents/Microsoft Edge",
    "/Applications/Arc.app/Contents/MacOS/Arc",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ]
  const found = candidates.find(existsSync)
  if (found) return found
  throw new Error(
    "chrome backend: no system Chromium browser found. Install Google Chrome, Brave, Edge, Arc, or Chromium, or use the 'canvas' backend.",
  )
}

export const ChromeRenderer: Renderer = {
  name: "chrome",
  async render(markdown, options) {
    const executablePath = findBrowser()
    const html = markdownToHtml(markdown, options.theme, options.colors)
    const browser = await puppeteer.launch({
      executablePath,
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-extensions",
        "--disable-background-networking",
      ],
    })
    try {
      const page = await browser.newPage()
      await page.setDefaultNavigationTimeout(60000)
      await page.setViewport({ width: options.width, height: 800, deviceScaleFactor: options.scale ?? 2 })
      await page.setContent(html, { waitUntil: "load" })
      const document = await page.$(".markdown-body")
      if (!document) throw new Error("chrome backend: rendered document was not found")
      const png = await document.screenshot({ type: "png" })
      return { png: new Uint8Array(png as Uint8Array) }
    } finally {
      await browser.close()
    }
  },
}

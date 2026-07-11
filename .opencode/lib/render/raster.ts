import { createCanvas, loadImage } from "@napi-rs/canvas"

async function lastVisibleRow(png: Uint8Array, width: number, height: number): Promise<number> {
  const image = await loadImage(png)
  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")
  ctx.drawImage(image, 0, 0)
  const pixels = ctx.getImageData(0, 0, width, height).data
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 8) return y
    }
  }
  return -1
}

export async function renderAndCrop(
  width: number,
  background: string,
  render: (height: number) => Promise<Uint8Array>,
): Promise<Uint8Array> {
  let height = 1024
  let png = await render(height)
  let last = await lastVisibleRow(png, width, height)
  while (last >= height - 32 && height < 32768) {
    height *= 2
    png = await render(height)
    last = await lastVisibleRow(png, width, height)
  }
  if (last >= height - 32) throw new Error("rendered content exceeds the 32768px height limit")
  const finalHeight = Math.max(96, last + 49)
  const image = await loadImage(png)
  const canvas = createCanvas(width, finalHeight)
  const ctx = canvas.getContext("2d")
  ctx.fillStyle = background
  ctx.fillRect(0, 0, width, finalHeight)
  ctx.drawImage(image, 0, 0)
  return new Uint8Array(canvas.toBuffer("image/png"))
}

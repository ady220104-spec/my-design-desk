// 从底图采样颜色，用于让遮盖层与背景自然融合（解决 PRD 里"遮盖突兀"的核心风险）。
// 底图来自 IndexedDB blob 的 objectURL，与页面同源，不会污染 canvas，可安全 getImageData。

const imageCache = new Map<string, HTMLImageElement>()

function loadImage(url: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(url)
  if (cached) return Promise.resolve(cached)
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      imageCache.set(url, img)
      resolve(img)
    }
    img.onerror = reject
    img.src = url
  })
}

function toHex(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
}

/**
 * 采样底图在画布坐标 (px, py) 处的颜色。
 * canvasW/canvasH 为模板画布尺寸；底图会被等比铺满到该尺寸后采样，
 * 因此画布坐标可直接作为采样坐标。
 */
export async function sampleColor(
  url: string,
  canvasW: number,
  canvasH: number,
  px: number,
  py: number
): Promise<string> {
  const img = await loadImage(url)
  const off = document.createElement('canvas')
  off.width = canvasW
  off.height = canvasH
  const ctx = off.getContext('2d', { willReadFrequently: true })
  if (!ctx) return '#000000'
  ctx.drawImage(img, 0, 0, canvasW, canvasH)

  const x = Math.max(0, Math.min(canvasW - 1, Math.round(px)))
  const y = Math.max(0, Math.min(canvasH - 1, Math.round(py)))
  const d = ctx.getImageData(x, y, 1, 1).data
  return `#${toHex(d[0])}${toHex(d[1])}${toHex(d[2])}`
}

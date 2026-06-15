import type { Template, TemplateDocument } from '../types'
import { loadAsset } from '../store/db'

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

export async function exportTemplateJSON(template: Template): Promise<string> {
  const assetIds = new Set<string>()
  for (const layer of template.layers) {
    if (layer.type === 'background') {
      assetIds.add(layer.assetId)
    }
  }

  const assets = []
  for (const id of assetIds) {
    const record = await loadAsset(id)
    if (record) {
      const base64 = await blobToBase64(record.blob)
      assets.push({
        id: record.id,
        type: 'image' as const,
        name: record.name,
        mimeType: record.mimeType,
        base64,
      })
    }
  }

  const doc: TemplateDocument = {
    version: '1.0',
    template,
    assets,
  }

  return JSON.stringify(doc, null, 2)
}

export function base64ToBlob(base64: string): Blob {
  const [meta, data] = base64.split(',')
  const mimeMatch = meta.match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const byteString = atob(data)
  const ab = new ArrayBuffer(byteString.length)
  const ia = new Uint8Array(ab)
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i)
  }
  return new Blob([ab], { type: mime })
}

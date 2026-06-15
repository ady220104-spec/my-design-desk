import type { TemplateDocument } from '../types'
import { saveTemplate, saveAsset } from '../store/db'
import { base64ToBlob } from './export'

export async function importTemplateJSON(json: string): Promise<string> {
  const doc: TemplateDocument = JSON.parse(json)

  for (const asset of doc.assets) {
    if (asset.base64) {
      const blob = base64ToBlob(asset.base64)
      await saveAsset(asset.id, blob, asset.name, asset.mimeType)
    }
  }

  await saveTemplate(doc.template)
  return doc.template.id
}

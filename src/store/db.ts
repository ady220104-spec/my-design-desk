import Dexie, { type EntityTable } from 'dexie'
import type { Template } from '../types'

interface AssetRecord {
  id: string
  blob: Blob
  name: string
  mimeType: string
}

const db = new Dexie('MyDesignDesk') as Dexie & {
  templates: EntityTable<Template, 'id'>
  assets: EntityTable<AssetRecord, 'id'>
}

db.version(1).stores({
  templates: 'id, name, updatedAt',
  assets: 'id',
})

export async function saveTemplate(template: Template): Promise<void> {
  await db.templates.put({ ...template, updatedAt: new Date().toISOString() })
}

export async function loadTemplate(id: string): Promise<Template | undefined> {
  return db.templates.get(id)
}

export async function listTemplates(): Promise<Template[]> {
  return db.templates.orderBy('updatedAt').reverse().toArray()
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id)
}

export async function saveAsset(id: string, blob: Blob, name: string, mimeType: string): Promise<void> {
  await db.assets.put({ id, blob, name, mimeType })
}

export async function loadAsset(id: string): Promise<AssetRecord | undefined> {
  return db.assets.get(id)
}

export async function deleteAsset(id: string): Promise<void> {
  await db.assets.delete(id)
}

// 返回模板中底图资源已丢失的 assetId 列表（用于导出前校验与画布提示）
export async function checkBackgroundAssets(template: Template): Promise<string[]> {
  const missing: string[] = []
  for (const l of template.layers) {
    if (l.type === 'background') {
      const rec = await db.assets.get(l.assetId)
      if (!rec) missing.push(l.assetId)
    }
  }
  return missing
}

export { db }

import { create } from 'zustand'
import type { Template, Layer, Field, TextLayer } from '../types'
import { saveTemplate as dbSave, loadAsset } from './db'
import { generateId } from '../utils/id'

const HISTORY_LIMIT = 50

// 模块级变量：记录上一次历史操作的"签名"，用于合并连续的同目标编辑
// （例如连续输入同一字段、连续拖同一图层只产生一条历史，而不是每个字符一条）。
let lastHistoryKey: string | null = null

function snapshot(t: Template): Template {
  return structuredClone(t)
}

interface TemplateState {
  currentTemplate: Template | null
  selectedLayerId: string | null
  isDirty: boolean
  assetUrls: Record<string, string>
  past: Template[]
  future: Template[]

  setTemplate: (t: Template) => void
  clearTemplate: () => void
  setSelectedLayer: (id: string | null) => void

  addLayer: (layer: Layer) => void
  updateLayer: (id: string, patch: Partial<Layer>) => void
  removeLayer: (id: string) => void

  addField: (field: Field) => void
  updateField: (id: string, value: string) => void
  removeField: (id: string) => void
  bindFieldToLayer: (fieldId: string, layerId: string) => void

  updatePromptInfo: (patch: Partial<Template['promptInfo']>) => void
  updateTemplateMeta: (patch: Partial<Pick<Template, 'name' | 'tags'>>) => void

  undo: () => void
  redo: () => void

  saveVersion: (name: string) => void
  restoreVersion: (id: string) => void

  save: () => Promise<void>
  loadAssetUrl: (assetId: string) => Promise<string | null>
}

export const useTemplateStore = create<TemplateState>((set, get) => {
  // 在一次会改变模板的操作之前，记录改动前的快照到历史栈。
  // key 相同且连续时合并（不新增历史项）；key 为 undefined 的离散操作每次都记。
  const pushHistory = (key?: string) => {
    const { currentTemplate } = get()
    if (!currentTemplate) return
    if (key !== undefined && key === lastHistoryKey) return
    lastHistoryKey = key ?? null
    set((s) => ({
      past: [...s.past, snapshot(currentTemplate)].slice(-HISTORY_LIMIT),
      future: [],
    }))
  }

  return {
    currentTemplate: null,
    selectedLayerId: null,
    isDirty: false,
    assetUrls: {},
    past: [],
    future: [],

    setTemplate: (t) => {
      lastHistoryKey = null
      set({ currentTemplate: t, selectedLayerId: null, isDirty: false, past: [], future: [] })
    },
    clearTemplate: () => {
      lastHistoryKey = null
      set({ currentTemplate: null, selectedLayerId: null, isDirty: false, assetUrls: {}, past: [], future: [] })
    },

    setSelectedLayer: (id) => set({ selectedLayerId: id }),

    addLayer: (layer) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory()
      set({
        currentTemplate: { ...currentTemplate, layers: [...currentTemplate.layers, layer] },
        isDirty: true,
      })
    },

    updateLayer: (id, patch) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory(`layer:${id}:${Object.keys(patch).join(',')}`)
      set({
        currentTemplate: {
          ...currentTemplate,
          layers: currentTemplate.layers.map((l) => (l.id === id ? { ...l, ...patch } as Layer : l)),
        },
        isDirty: true,
      })
    },

    removeLayer: (id) => {
      const { currentTemplate, selectedLayerId } = get()
      if (!currentTemplate) return
      const layer = currentTemplate.layers.find((l) => l.id === id)
      if (layer?.locked) return
      pushHistory()
      set({
        currentTemplate: {
          ...currentTemplate,
          layers: currentTemplate.layers.filter((l) => l.id !== id),
          fields: currentTemplate.fields.map((f) =>
            f.layerId === id ? { ...f, layerId: undefined } : f
          ),
        },
        selectedLayerId: selectedLayerId === id ? null : selectedLayerId,
        isDirty: true,
      })
    },

    addField: (field) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory()
      set({
        currentTemplate: { ...currentTemplate, fields: [...currentTemplate.fields, field] },
        isDirty: true,
      })
    },

    updateField: (id, value) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      const field = currentTemplate.fields.find((f) => f.id === id)
      if (!field) return
      pushHistory(`field:${id}`)

      const newFields = currentTemplate.fields.map((f) => (f.id === id ? { ...f, value } : f))
      let newLayers = currentTemplate.layers
      if (field.layerId) {
        newLayers = currentTemplate.layers.map((l) =>
          l.id === field.layerId && l.type === 'text'
            ? { ...l, text: value } as TextLayer
            : l
        )
      }

      set({
        currentTemplate: { ...currentTemplate, fields: newFields, layers: newLayers },
        isDirty: true,
      })
    },

    removeField: (id) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory()
      const field = currentTemplate.fields.find((f) => f.id === id)
      let newLayers = currentTemplate.layers
      if (field?.layerId) {
        newLayers = currentTemplate.layers.map((l) =>
          l.id === field.layerId && l.type === 'text' ? { ...l, fieldId: undefined } as TextLayer : l
        )
      }
      set({
        currentTemplate: {
          ...currentTemplate,
          fields: currentTemplate.fields.filter((f) => f.id !== id),
          layers: newLayers,
        },
        isDirty: true,
      })
    },

    bindFieldToLayer: (fieldId, layerId) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      const field = currentTemplate.fields.find((f) => f.id === fieldId)
      const layer = currentTemplate.layers.find((l) => l.id === layerId)
      if (!field || !layer || layer.type !== 'text') return
      pushHistory()

      const newFields = currentTemplate.fields.map((f) =>
        f.id === fieldId ? { ...f, layerId } : f
      )
      const newLayers = currentTemplate.layers.map((l) =>
        l.id === layerId && l.type === 'text'
          ? { ...l, fieldId, text: field.value || (l as TextLayer).text } as TextLayer
          : l
      )

      set({
        currentTemplate: { ...currentTemplate, fields: newFields, layers: newLayers },
        isDirty: true,
      })
    },

    updatePromptInfo: (patch) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory(`prompt:${Object.keys(patch).join(',')}`)
      set({
        currentTemplate: {
          ...currentTemplate,
          promptInfo: { ...currentTemplate.promptInfo, ...patch },
        },
        isDirty: true,
      })
    },

    updateTemplateMeta: (patch) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory(`meta:${Object.keys(patch).join(',')}`)
      set({
        currentTemplate: { ...currentTemplate, ...patch },
        isDirty: true,
      })
    },

    undo: () => {
      const { past, currentTemplate } = get()
      if (past.length === 0 || !currentTemplate) return
      lastHistoryKey = '__nav__'
      const prev = past[past.length - 1]
      set((s) => ({
        currentTemplate: prev,
        past: s.past.slice(0, -1),
        future: [snapshot(currentTemplate), ...s.future].slice(0, HISTORY_LIMIT),
        isDirty: true,
        selectedLayerId: null,
      }))
    },

    redo: () => {
      const { future, currentTemplate } = get()
      if (future.length === 0 || !currentTemplate) return
      lastHistoryKey = '__nav__'
      const next = future[0]
      set((s) => ({
        currentTemplate: next,
        future: s.future.slice(1),
        past: [...s.past, snapshot(currentTemplate)].slice(-HISTORY_LIMIT),
        isDirty: true,
        selectedLayerId: null,
      }))
    },

    saveVersion: (name) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      pushHistory()
      const fieldSnapshot: Record<string, string> = {}
      currentTemplate.fields.forEach((f) => (fieldSnapshot[f.id] = f.value))
      const version = {
        id: generateId('ver'),
        name: name || new Date().toLocaleString('zh-CN'),
        createdAt: new Date().toISOString(),
        fieldSnapshot,
      }
      set({
        currentTemplate: { ...currentTemplate, versions: [...currentTemplate.versions, version] },
        isDirty: true,
      })
    },

    restoreVersion: (id) => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      const v = currentTemplate.versions.find((x) => x.id === id)
      if (!v) return
      pushHistory()
      const newFields = currentTemplate.fields.map((f) =>
        f.id in v.fieldSnapshot ? { ...f, value: v.fieldSnapshot[f.id] } : f
      )
      const newLayers = currentTemplate.layers.map((l) =>
        l.type === 'text' && l.fieldId && l.fieldId in v.fieldSnapshot
          ? ({ ...l, text: v.fieldSnapshot[l.fieldId] } as TextLayer)
          : l
      )
      set({
        currentTemplate: { ...currentTemplate, fields: newFields, layers: newLayers },
        isDirty: true,
      })
    },

    save: async () => {
      const { currentTemplate } = get()
      if (!currentTemplate) return
      await dbSave(currentTemplate)
      set({ isDirty: false })
    },

    loadAssetUrl: async (assetId: string) => {
      const cached = get().assetUrls[assetId]
      if (cached) return cached
      const record = await loadAsset(assetId)
      if (!record) return null
      const url = URL.createObjectURL(record.blob)
      set((s) => ({ assetUrls: { ...s.assetUrls, [assetId]: url } }))
      return url
    },
  }
})

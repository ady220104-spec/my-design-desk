import { useState, useRef, useEffect } from 'react'
import { useTemplateStore } from './store/useTemplateStore'
import { TemplateLibrary } from './components/TemplateLibrary'
import { Canvas } from './components/Canvas'
import { FieldPanel } from './components/FieldPanel'
import { LayerPanel } from './components/LayerPanel'
import { PromptPanel } from './components/PromptPanel'
import { VersionPanel } from './components/VersionPanel'
import { CreateTemplateDialog } from './components/CreateTemplateDialog'
import { ExportDialog } from './components/ExportDialog'
import { BatchExportDialog } from './components/BatchExportDialog'
import { importTemplateJSON } from './utils/import'
import { loadTemplate } from './store/db'

type RightTab = 'fields' | 'layers' | 'prompt' | 'versions'

export default function App() {
  const [showCreate, setShowCreate] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showBatch, setShowBatch] = useState(false)
  const [rightTab, setRightTab] = useState<RightTab>('fields')
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  const template = useTemplateStore((s) => s.currentTemplate)
  const isDirty = useTemplateStore((s) => s.isDirty)
  const save = useTemplateStore((s) => s.save)
  const setTemplate = useTemplateStore((s) => s.setTemplate)
  const undo = useTemplateStore((s) => s.undo)
  const redo = useTemplateStore((s) => s.redo)
  const canUndo = useTemplateStore((s) => s.past.length > 0)
  const canRedo = useTemplateStore((s) => s.future.length > 0)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2000)
  }

  const handleSave = async () => {
    try {
      await save()
      showToast('已保存')
    } catch (e) {
      const msg = String((e as Error)?.name || e)
      showToast(/quota/i.test(msg) ? '存储空间不足，请删除旧模板或导出备份' : '保存失败', 'error')
    }
  }

  const handleImportJSON = () => {
    importRef.current?.click()
  }

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const templateId = await importTemplateJSON(text)
      const t = await loadTemplate(templateId)
      if (t) {
        setTemplate(t)
        showToast('模板导入成功')
      }
    } catch (err) {
      showToast('导入失败: ' + (err as Error).message, 'error')
    }
    e.target.value = ''
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const st = useTemplateStore.getState()
      const hasTpl = !!st.currentTemplate
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key.toLowerCase()
      const tag = (e.target as HTMLElement)?.tagName
      const inField = tag === 'INPUT' || tag === 'TEXTAREA'

      if (ctrl && key === 's') {
        e.preventDefault()
        if (hasTpl) st.save().then(() => showToast('已保存')).catch(() => showToast('保存失败', 'error'))
        return
      }
      if (ctrl && key === 'z') {
        if (inField) return // 在输入框里让浏览器原生撤销文字
        e.preventDefault()
        if (!hasTpl) return
        if (e.shiftKey) st.redo()
        else st.undo()
        return
      }
      if (ctrl && key === 'e') {
        e.preventDefault()
        if (hasTpl) setShowExport(true)
        return
      }
      if (e.key === 'Delete' && st.selectedLayerId && !inField) {
        const layer = st.currentTemplate?.layers.find((l) => l.id === st.selectedLayerId)
        if (layer && !layer.locked) st.removeLayer(st.selectedLayerId)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      {/* Top bar */}
      <div className="topbar">
        <span className="topbar-title">我的设计台</span>
        <button className="topbar-btn" onClick={() => setShowCreate(true)}>新建模板</button>
        {template && (
          <>
            <button className="topbar-btn primary" onClick={handleSave}>保存</button>
            <button className="topbar-btn" onClick={() => setShowExport(true)}>导出</button>
            <button className="topbar-btn" onClick={() => setShowBatch(true)}>批量</button>
          </>
        )}
        <button className="topbar-btn" onClick={handleImportJSON}>导入备份</button>
        <div className="topbar-spacer" />
        {isDirty && <span className="topbar-dirty">● 未保存</span>}
        {template && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{template.name}</span>
        )}
      </div>

      {/* Main 3-panel layout */}
      <div className="main-layout">
        <TemplateLibrary
          onCreateNew={() => setShowCreate(true)}
          onImportJSON={handleImportJSON}
        />

        <Canvas />

        <div className="right-panel">
          <div className="right-tabs">
            <div
              className={`right-tab ${rightTab === 'fields' ? 'active' : ''}`}
              onClick={() => setRightTab('fields')}
            >
              字段
            </div>
            <div
              className={`right-tab ${rightTab === 'layers' ? 'active' : ''}`}
              onClick={() => setRightTab('layers')}
            >
              图层
            </div>
            <div
              className={`right-tab ${rightTab === 'prompt' ? 'active' : ''}`}
              onClick={() => setRightTab('prompt')}
            >
              Prompt
            </div>
            <div
              className={`right-tab ${rightTab === 'versions' ? 'active' : ''}`}
              onClick={() => setRightTab('versions')}
            >
              版本
            </div>
          </div>
          <div className="right-content">
            {rightTab === 'fields' && <FieldPanel />}
            {rightTab === 'layers' && <LayerPanel />}
            {rightTab === 'prompt' && <PromptPanel />}
            {rightTab === 'versions' && <VersionPanel />}
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bottombar">
        {template && (
          <>
            <span>画布 {template.canvas.width}×{template.canvas.height}</span>
            <span>{template.layers.length} 层</span>
            <span>{template.fields.length} 字段</span>
            <button className="sm-btn" disabled={!canUndo} onClick={undo} title="Ctrl+Z">↶ 撤销</button>
            <button className="sm-btn" disabled={!canRedo} onClick={redo} title="Ctrl+Shift+Z">↷ 重做</button>
          </>
        )}
        <div style={{ flex: 1 }} />
        <span>Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+E 导出 · Delete 删除图层</span>
      </div>

      {/* Modals */}
      {showCreate && <CreateTemplateDialog onClose={() => setShowCreate(false)} />}
      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showBatch && <BatchExportDialog onClose={() => setShowBatch(false)} />}

      {/* Hidden file input for JSON import */}
      <input
        type="file"
        ref={importRef}
        style={{ display: 'none' }}
        accept=".json"
        onChange={handleImportFile}
      />

      {/* Toast */}
      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </>
  )
}

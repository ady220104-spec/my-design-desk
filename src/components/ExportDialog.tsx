import { useState } from 'react'
import { useTemplateStore } from '../store/useTemplateStore'
import { exportTemplateJSON, downloadDataUrl, downloadBlob } from '../utils/export'
import { checkBackgroundAssets } from '../store/db'
import { getExportCanvas } from './Canvas'

interface Props {
  onClose: () => void
}

export function ExportDialog({ onClose }: Props) {
  const template = useTemplateStore((s) => s.currentTemplate)
  const [exporting, setExporting] = useState(false)
  const [status, setStatus] = useState('')
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [quality, setQuality] = useState(0.92)

  if (!template) return null

  const emptyRequired = template.fields.filter((f) => f.required && !f.value.trim())

  const handleExportImage = async () => {
    if (emptyRequired.length > 0) {
      alert(`必填字段为空：${emptyRequired.map((f) => f.label).join('、')}`)
      return
    }

    const missingBg = await checkBackgroundAssets(template)
    if (missingBg.length > 0) {
      alert('底图缺失，无法导出，请先重新绑定底图')
      return
    }

    setExporting(true)
    setStatus('正在渲染图片...')
    try {
      const dataUrl = await getExportCanvas(format, quality)
      const ext = format === 'jpeg' ? 'jpg' : 'png'
      const dateField = template.fields.find((f) => f.required)?.value || ''
      const fileName = `${template.name}-${dateField}.${ext}`.replace(/[/\\:*?"<>|]/g, '-')
      downloadDataUrl(dataUrl, fileName)
      setStatus('导出成功！')
      setTimeout(() => onClose(), 1000)
    } catch (err) {
      setStatus(`导出失败: ${(err as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  const handleExportJSON = async () => {
    setExporting(true)
    setStatus('正在生成模板备份...')
    try {
      const json = await exportTemplateJSON(template)
      const blob = new Blob([json], { type: 'application/json' })
      const fileName = `${template.name}.template.json`
      downloadBlob(blob, fileName)
      setStatus('备份导出成功！')
      setTimeout(() => onClose(), 1000)
    } catch (err) {
      setStatus(`导出失败: ${(err as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 380 }}>
        <div className="modal-title">导出</div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
            模板: {template.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {template.canvas.width} × {template.canvas.height}
          </div>
        </div>

        {emptyRequired.length > 0 && (
          <div style={{ padding: 8, background: 'rgba(239,68,68,0.1)', borderRadius: 6, marginBottom: 12, fontSize: 12, color: 'var(--danger)' }}>
            必填字段为空：{emptyRequired.map((f) => f.label).join('、')}
          </div>
        )}

        {/* 图片格式选择 */}
        <div className="field-group">
          <div className="field-label">图片格式</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={`tool-btn ${format === 'png' ? 'active' : ''}`}
              onClick={() => setFormat('png')}
            >
              PNG（无损）
            </button>
            <button
              className={`tool-btn ${format === 'jpeg' ? 'active' : ''}`}
              onClick={() => setFormat('jpeg')}
            >
              JPG（更小）
            </button>
          </div>
        </div>

        {format === 'jpeg' && (
          <div className="field-group">
            <div className="field-label">JPG 质量</div>
            <select
              className="field-input"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            >
              <option value={0.8}>80%</option>
              <option value={0.92}>90%</option>
              <option value={1}>100%</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 16 }}>
          <button
            className="topbar-btn primary"
            onClick={handleExportImage}
            disabled={exporting}
            style={{ flex: 1 }}
          >
            导出 {format === 'jpeg' ? 'JPG' : 'PNG'}
          </button>
          <button
            className="topbar-btn"
            onClick={handleExportJSON}
            disabled={exporting}
            style={{ flex: 1 }}
          >
            导出模板 JSON
          </button>
        </div>

        {status && (
          <div style={{ fontSize: 12, color: status.includes('失败') ? 'var(--danger)' : 'var(--success)', textAlign: 'center' }}>
            {status}
          </div>
        )}

        <div className="modal-actions">
          <button className="topbar-btn" onClick={onClose}>关闭</button>
        </div>
      </div>
    </div>
  )
}

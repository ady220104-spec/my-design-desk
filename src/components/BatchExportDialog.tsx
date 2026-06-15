import { useState } from 'react'
import JSZip from 'jszip'
import { useTemplateStore } from '../store/useTemplateStore'
import { renderTemplateToDataURL } from './Canvas'
import { downloadBlob, exportTemplateJSON } from '../utils/export'

interface Props {
  onClose: () => void
}

type Row = Record<string, string>

export function BatchExportDialog({ onClose }: Props) {
  const template = useTemplateStore((s) => s.currentTemplate)

  // 初始一行 = 当前模板各字段的现有值
  const initRow = (): Row => {
    const r: Row = {}
    template?.fields.forEach((f) => (r[f.id] = f.value))
    return r
  }

  const [rows, setRows] = useState<Row[]>(() => [initRow()])
  const [format, setFormat] = useState<'png' | 'jpeg'>('png')
  const [includeJson, setIncludeJson] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState('')

  if (!template) return null

  if (template.fields.length === 0) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-title">批量导出</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '12px 0' }}>
            当前模板还没有字段。请先在右侧「字段」面板创建并绑定字段，再来批量导出多期。
          </div>
          <div className="modal-actions">
            <button className="topbar-btn" onClick={onClose}>关闭</button>
          </div>
        </div>
      </div>
    )
  }

  const fields = template.fields

  const setCell = (rowIdx: number, fieldId: string, value: string) => {
    setRows((rs) => rs.map((r, i) => (i === rowIdx ? { ...r, [fieldId]: value } : r)))
  }

  const addRow = () => setRows((rs) => [...rs, { ...rs[rs.length - 1] }])
  const removeRow = (idx: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs))

  // 校验：每行的必填字段都不能为空
  const findEmptyRequired = (): string | null => {
    for (let i = 0; i < rows.length; i++) {
      for (const f of fields) {
        if (f.required && !(rows[i][f.id] || '').trim()) {
          return `第 ${i + 1} 期的「${f.label}」为空`
        }
      }
    }
    return null
  }

  const fileBaseName = (row: Row, idx: number): string => {
    const firstRequired = fields.find((f) => f.required) || fields[0]
    const tag = (row[firstRequired.id] || `第${idx + 1}期`).trim()
    return `${template.name}-${tag}`.replace(/[/\\:*?"<>|]/g, '-')
  }

  const handleExport = async () => {
    const err = findEmptyRequired()
    if (err) {
      alert(`无法导出：${err}`)
      return
    }

    setExporting(true)
    const zip = new JSZip()
    const ext = format === 'jpeg' ? 'jpg' : 'png'
    const usedNames = new Set<string>()

    try {
      // 串行渲染，避免一次性渲染多张大图造成内存压力（PRD 8.3）
      for (let i = 0; i < rows.length; i++) {
        setProgress(`正在渲染第 ${i + 1} / ${rows.length} 张...`)
        const dataUrl = await renderTemplateToDataURL(template, rows[i], format, format === 'jpeg' ? 0.92 : 1)
        const base64 = dataUrl.split(',')[1]
        let name = `${fileBaseName(rows[i], i)}.${ext}`
        if (usedNames.has(name)) name = `${fileBaseName(rows[i], i)}-${i + 1}.${ext}`
        usedNames.add(name)
        zip.file(name, base64, { base64: true })
      }

      if (includeJson) {
        const json = await exportTemplateJSON(template)
        zip.file(`${template.name}.template.json`, json)
      }

      setProgress('正在打包 ZIP...')
      const blob = await zip.generateAsync({ type: 'blob' })
      downloadBlob(blob, `${template.name}-批量导出-${rows.length}张.zip`.replace(/[/\\:*?"<>|]/g, '-'))
      setProgress(`完成！已导出 ${rows.length} 张图片`)
      setTimeout(() => onClose(), 1200)
    } catch (e) {
      setProgress(`导出失败：${(e as Error).message}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ minWidth: 560, maxWidth: 760 }}>
        <div className="modal-title">批量导出（多期）</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          每一行是一期海报，填入不同的字段值（如各月日期、门店），一次导出多张同款图片并打包成 ZIP。
        </div>

        {/* 变量表 */}
        <div style={{ maxHeight: 320, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                {fields.map((f) => (
                  <th key={f.id} style={thStyle}>
                    {f.label}
                    {f.required && <span style={{ color: 'var(--danger)' }}> *</span>}
                  </th>
                ))}
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  {fields.map((f) => (
                    <td key={f.id} style={tdStyle}>
                      <input
                        className="field-input"
                        style={{ fontSize: 12, padding: '4px 6px' }}
                        value={row[f.id] || ''}
                        onChange={(e) => setCell(i, f.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td style={tdStyle}>
                    <button className="sm-btn danger" onClick={() => removeRow(i)} disabled={rows.length <= 1}>
                      删
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          <button className="sm-btn" onClick={addRow}>+ 添加一期</button>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>共 {rows.length} 期</span>

          <span style={{ flex: 1 }} />

          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>格式</span>
          <button className={`tool-btn ${format === 'png' ? 'active' : ''}`} onClick={() => setFormat('png')}>PNG</button>
          <button className={`tool-btn ${format === 'jpeg' ? 'active' : ''}`} onClick={() => setFormat('jpeg')}>JPG</button>

          <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
            <input type="checkbox" checked={includeJson} onChange={(e) => setIncludeJson(e.target.checked)} />
            含模板 JSON
          </label>
        </div>

        {progress && (
          <div style={{ marginTop: 12, fontSize: 12, color: progress.includes('失败') ? 'var(--danger)' : 'var(--success)', textAlign: 'center' }}>
            {progress}
          </div>
        )}

        <div className="modal-actions">
          <button className="topbar-btn" onClick={onClose} disabled={exporting}>取消</button>
          <button className="topbar-btn primary" onClick={handleExport} disabled={exporting}>
            {exporting ? '导出中...' : `导出 ${rows.length} 张并打包 ZIP`}
          </button>
        </div>
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  color: 'var(--text-secondary)',
  borderBottom: '1px solid var(--border)',
  position: 'sticky',
  top: 0,
  background: 'var(--bg-panel)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
}

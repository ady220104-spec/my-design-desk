import { useState } from 'react'
import { useTemplateStore } from '../store/useTemplateStore'

export function VersionPanel() {
  const template = useTemplateStore((s) => s.currentTemplate)
  const saveVersion = useTemplateStore((s) => s.saveVersion)
  const restoreVersion = useTemplateStore((s) => s.restoreVersion)
  const [name, setName] = useState('')

  if (!template) {
    return (
      <div className="empty-state">
        <div>请先打开一个模板</div>
      </div>
    )
  }

  const handleSave = () => {
    saveVersion(name.trim())
    setName('')
  }

  const versions = [...template.versions].reverse()

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
        历史版本
      </div>

      <div className="field-group">
        <input
          className="field-input"
          placeholder="版本名（如：7月上海静安店）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
        />
        <div className="field-actions">
          <button className="sm-btn" onClick={handleSave}>保存当前为版本</button>
        </div>
      </div>

      {versions.length === 0 ? (
        <div className="empty-state" style={{ padding: '16px 0' }}>
          <div style={{ fontSize: 12 }}>还没有保存版本</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>填好字段后点"保存当前为版本"留档</div>
        </div>
      ) : (
        versions.map((v) => (
          <div
            key={v.id}
            style={{
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              marginBottom: 6,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{v.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
              {new Date(v.createdAt).toLocaleString('zh-CN')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 6 }}>
              {Object.entries(v.fieldSnapshot)
                .map(([fid, val]) => {
                  const f = template.fields.find((x) => x.id === fid)
                  return `${f?.label || fid}: ${val}`
                })
                .join(' · ')}
            </div>
            <button className="sm-btn" onClick={() => restoreVersion(v.id)}>恢复此版本</button>
          </div>
        ))
      )}
    </div>
  )
}

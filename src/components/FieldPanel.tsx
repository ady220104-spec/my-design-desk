import { useTemplateStore } from '../store/useTemplateStore'
import { generateId } from '../utils/id'

export function FieldPanel() {
  const template = useTemplateStore((s) => s.currentTemplate)
  const updateField = useTemplateStore((s) => s.updateField)
  const addField = useTemplateStore((s) => s.addField)
  const removeField = useTemplateStore((s) => s.removeField)
  const bindFieldToLayer = useTemplateStore((s) => s.bindFieldToLayer)
  const selectedLayerId = useTemplateStore((s) => s.selectedLayerId)

  if (!template) {
    return (
      <div className="empty-state">
        <div>请先打开一个模板</div>
      </div>
    )
  }

  const handleAddField = () => {
    const id = generateId('field')
    addField({
      id,
      label: '新字段',
      type: 'text',
      value: '',
      required: false,
    })
  }

  const handleBind = (fieldId: string) => {
    if (!selectedLayerId) {
      alert('请先在画布中选中一个文字层')
      return
    }
    const layer = template.layers.find((l) => l.id === selectedLayerId)
    if (!layer || layer.type !== 'text') {
      alert('只能绑定文字层')
      return
    }
    bindFieldToLayer(fieldId, selectedLayerId)
  }

  return (
    <div>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>模板字段</span>
        <button className="sm-btn" onClick={handleAddField}>+ 新字段</button>
      </div>

      {template.fields.length === 0 ? (
        <div className="empty-state" style={{ padding: '16px 0' }}>
          <div style={{ fontSize: 12 }}>还没有可编辑字段</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>添加文字层时会自动创建字段</div>
        </div>
      ) : (
        template.fields.map((field) => {
          const bound = field.layerId
            ? template.layers.find((l) => l.id === field.layerId)
            : null
          return (
            <div key={field.id} className="field-group">
              <div className="field-label">
                <input
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    padding: 0,
                    outline: 'none',
                    width: '100%',
                  }}
                  value={field.label}
                  onChange={(e) => {
                    const t = useTemplateStore.getState().currentTemplate
                    if (!t) return
                    useTemplateStore.setState({
                      currentTemplate: {
                        ...t,
                        fields: t.fields.map((f) =>
                          f.id === field.id ? { ...f, label: e.target.value } : f
                        ),
                      },
                      isDirty: true,
                    })
                  }}
                />
                {field.required && <span className="field-required">*</span>}
              </div>
              <input
                className="field-input"
                value={field.value}
                onChange={(e) => updateField(field.id, e.target.value)}
                placeholder={`输入${field.label}...`}
              />
              {!bound && (
                <div className="field-hint">未绑定图层</div>
              )}
              <div className="field-actions">
                {!bound && (
                  <button className="sm-btn" onClick={() => handleBind(field.id)}>
                    绑定选中层
                  </button>
                )}
                {bound && (
                  <span style={{ fontSize: 11, color: 'var(--success)' }}>
                    已绑定: {bound.type === 'text' ? (bound.text || '').slice(0, 10) : bound.id}
                  </span>
                )}
                <button className="sm-btn danger" onClick={() => removeField(field.id)}>删除</button>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

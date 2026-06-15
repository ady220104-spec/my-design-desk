import { useState, useEffect, useCallback } from 'react'
import { listTemplates, deleteTemplate as dbDelete, saveTemplate } from '../store/db'
import { useTemplateStore } from '../store/useTemplateStore'
import { generateId } from '../utils/id'
import type { Template } from '../types'

interface Props {
  onCreateNew: () => void
  onImportJSON: () => void
}

export function TemplateLibrary({ onCreateNew, onImportJSON }: Props) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [search, setSearch] = useState('')
  const currentId = useTemplateStore((s) => s.currentTemplate?.id)
  const setTemplate = useTemplateStore((s) => s.setTemplate)
  const isDirty = useTemplateStore((s) => s.isDirty)
  const save = useTemplateStore((s) => s.save)

  const refresh = useCallback(async () => {
    const list = await listTemplates()
    setTemplates(list)
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(refresh, 2000)
    return () => clearInterval(id)
  }, [refresh])

  const handleOpen = async (t: Template) => {
    if (isDirty) {
      const ok = confirm('当前模板有未保存的修改，是否保存？')
      if (ok) await save()
    }
    setTemplate(t)
  }

  const handleDelete = async (e: React.MouseEvent, t: Template) => {
    e.stopPropagation()
    if (!confirm(`确定删除模板"${t.name}"？`)) return
    await dbDelete(t.id)
    if (currentId === t.id) {
      useTemplateStore.getState().clearTemplate()
    }
    refresh()
  }

  const handleDuplicate = async (e: React.MouseEvent, t: Template) => {
    e.stopPropagation()
    const now = new Date().toISOString()
    // 深拷贝；底图 asset 用同一 assetId 共享（删除模板不会删 asset），版本历史从空开始
    const copy: Template = {
      ...structuredClone(t),
      id: generateId('tpl'),
      name: `${t.name} 副本`,
      versions: [],
      createdAt: now,
      updatedAt: now,
    }
    await saveTemplate(copy)
    refresh()
  }

  const filtered = search
    ? templates.filter((t) =>
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.tags.some((tag) => tag.includes(search))
      )
    : templates

  return (
    <div className="left-panel">
      <div className="panel-header">模板库</div>
      <input
        className="search-input"
        placeholder="搜索模板..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="template-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📁</div>
            <div>{search ? '没有找到相关模板' : '还没有保存任何模板'}</div>
            {!search && (
              <>
                <button className="topbar-btn primary" onClick={onCreateNew}>
                  导入图片创建模板
                </button>
                <button className="topbar-btn" onClick={onImportJSON}>
                  导入模板备份
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map((t) => (
            <div
              key={t.id}
              className={`template-card ${t.id === currentId ? 'active' : ''}`}
              onClick={() => handleOpen(t)}
            >
              <div className="template-card-name">{t.name}</div>
              <div className="template-card-meta">
                {t.canvas.width}×{t.canvas.height}
                {t.tags.length > 0 && ` · ${t.tags.join('/')}`}
              </div>
              <div className="template-card-meta">
                {t.fields.length} 个字段 · {t.layers.filter((l) => l.type !== 'background').length} 个图层
              </div>
              <div className="field-actions" style={{ marginTop: 4 }}>
                <button className="sm-btn" onClick={(e) => handleDuplicate(e, t)}>复制</button>
                <button className="sm-btn danger" onClick={(e) => handleDelete(e, t)}>删除</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

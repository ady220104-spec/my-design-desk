import { useState, useRef } from 'react'
import { generateId } from '../utils/id'
import { saveAsset, saveTemplate } from '../store/db'
import { useTemplateStore } from '../store/useTemplateStore'
import { TEMPLATE_TYPES, TEMPLATE_PRESETS, UNCATEGORIZED } from '../utils/presets'
import type { Template, BackgroundLayer } from '../types'

interface Props {
  onClose: () => void
}

export function CreateTemplateDialog({ onClose }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const [name, setName] = useState('')
  const [tags, setTags] = useState('')
  const [templateType, setTemplateType] = useState<string>('')
  const [chosenFields, setChosenFields] = useState<string[]>([])
  const [modelName, setModelName] = useState('GPT Image 2')
  const [prompt, setPrompt] = useState('')
  const [creating, setCreating] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const setTemplate = useTemplateStore((s) => s.setTemplate)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return

    if (f.size > 20 * 1024 * 1024) {
      alert('文件过大，请选择小于 20MB 的图片')
      return
    }

    const validTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!validTypes.includes(f.type)) {
      alert('仅支持 PNG/JPG/WebP 格式')
      return
    }

    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)

    const img = new Image()
    img.onload = () => {
      setDims({ w: img.naturalWidth, h: img.naturalHeight })
      if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
    }
    img.src = url
  }

  const handleCreate = async () => {
    if (!file || !dims) return
    setCreating(true)

    try {
      const assetId = generateId('asset')
      const templateId = generateId('tpl')
      const bgLayerId = generateId('layer_bg')

      await saveAsset(assetId, file, file.name, file.type)

      const bgLayer: BackgroundLayer = {
        id: bgLayerId,
        type: 'background',
        assetId,
        locked: true,
      }

      const now = new Date().toISOString()
      const template: Template = {
        id: templateId,
        name: name || '未命名模板',
        templateType: templateType || UNCATEGORIZED,
        tags: tags.split(/[,，、\s]+/).filter(Boolean),
        canvas: {
          width: dims.w,
          height: dims.h,
          backgroundColor: '#ffffff',
        },
        promptInfo: {
          modelName,
          prompt,
          negativePrompt: '',
          styleNotes: '',
        },
        layers: [bgLayer],
        fields: chosenFields.map((label) => ({
          id: generateId('field'),
          label,
          type: 'text' as const,
          value: '',
          required: false,
        })),
        fieldPreset: templateType
          ? { presetName: templateType, suggestedFields: TEMPLATE_PRESETS[templateType] || [] }
          : undefined,
        versions: [],
        createdAt: now,
        updatedAt: now,
      }

      await saveTemplate(template)
      setTemplate(template)
      onClose()
    } catch (err) {
      alert('创建失败: ' + (err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleSelectType = (t: string) => {
    if (t === templateType) {
      setTemplateType('')
      setChosenFields([])
    } else {
      setTemplateType(t)
      setChosenFields(TEMPLATE_PRESETS[t] || [])
    }
  }

  const toggleField = (f: string) => {
    setChosenFields((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]))
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">创建模板</div>

        <input
          type="file"
          ref={fileRef}
          style={{ display: 'none' }}
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFile}
        />

        <div
          className={`upload-area ${file ? 'has-file' : ''}`}
          onClick={() => fileRef.current?.click()}
        >
          {preview ? (
            <div>
              <img
                src={preview}
                alt="预览"
                style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 4 }}
              />
              <div style={{ marginTop: 8 }}>
                {file!.name} · {dims ? `${dims.w}×${dims.h}` : '读取中...'}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📤</div>
              <div>点击上传图片 (PNG/JPG/WebP, &lt;20MB)</div>
            </div>
          )}
        </div>

        <div className="field-group" style={{ marginTop: 16 }}>
          <div className="field-label">模板名称</div>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：会员日月度海报"
          />
        </div>

        <div className="field-group">
          <div className="field-label">模板类型（用于分类和默认字段）</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {TEMPLATE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                className={`tool-btn ${templateType === t ? 'active' : ''}`}
                onClick={() => handleSelectType(t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {templateType && (
          <div className="field-group">
            <div className="field-label">推荐字段（点击增删，创建后可绑定文字层）</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(TEMPLATE_PRESETS[templateType] || []).map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`tool-btn ${chosenFields.includes(f) ? 'active' : ''}`}
                  onClick={() => toggleField(f)}
                >
                  {chosenFields.includes(f) ? '✓ ' : ''}
                  {f}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              将创建 {chosenFields.length} 个待绑定字段
            </div>
          </div>
        )}

        <div className="field-group">
          <div className="field-label">标签 (逗号分隔)</div>
          <input
            className="field-input"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="例如：月度, 会员日, 红金风格"
          />
        </div>

        <div className="field-group">
          <div className="field-label">生图模型</div>
          <input
            className="field-input"
            value={modelName}
            onChange={(e) => setModelName(e.target.value)}
            placeholder="例如 GPT Image 2"
          />
        </div>

        <div className="field-group">
          <div className="field-label">Prompt 备注</div>
          <textarea
            className="prompt-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入生图时使用的 Prompt..."
          />
        </div>

        <div className="modal-actions">
          <button className="topbar-btn" onClick={onClose}>取消</button>
          <button
            className="topbar-btn primary"
            onClick={handleCreate}
            disabled={!file || !dims || creating}
          >
            {creating ? '创建中...' : '进入模板化编辑'}
          </button>
        </div>
      </div>
    </div>
  )
}

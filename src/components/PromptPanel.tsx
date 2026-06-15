import { useState } from 'react'
import { useTemplateStore } from '../store/useTemplateStore'

export function PromptPanel() {
  const template = useTemplateStore((s) => s.currentTemplate)
  const updatePromptInfo = useTemplateStore((s) => s.updatePromptInfo)
  const [copied, setCopied] = useState(false)

  if (!template) return null

  const { promptInfo } = template

  const handleCopy = async () => {
    const text = [
      promptInfo.modelName && `模型: ${promptInfo.modelName}`,
      promptInfo.prompt && `Prompt: ${promptInfo.prompt}`,
      promptInfo.negativePrompt && `负面: ${promptInfo.negativePrompt}`,
      promptInfo.styleNotes && `风格: ${promptInfo.styleNotes}`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      alert('复制失败，请手动选择复制')
    }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
        Prompt 溯源信息
      </div>

      <div className="prompt-group">
        <div className="prompt-label">模型</div>
        <input
          className="field-input"
          value={promptInfo.modelName}
          onChange={(e) => updatePromptInfo({ modelName: e.target.value })}
          placeholder="例如 GPT Image 2"
        />
      </div>

      <div className="prompt-group">
        <div className="prompt-label">原始 Prompt</div>
        <textarea
          className="prompt-textarea"
          value={promptInfo.prompt}
          onChange={(e) => updatePromptInfo({ prompt: e.target.value })}
          placeholder="输入生图时使用的 Prompt..."
        />
      </div>

      <div className="prompt-group">
        <div className="prompt-label">负面要求</div>
        <textarea
          className="prompt-textarea"
          value={promptInfo.negativePrompt}
          onChange={(e) => updatePromptInfo({ negativePrompt: e.target.value })}
          placeholder="不要出现的内容..."
          style={{ minHeight: 40 }}
        />
      </div>

      <div className="prompt-group">
        <div className="prompt-label">风格备注</div>
        <textarea
          className="prompt-textarea"
          value={promptInfo.styleNotes}
          onChange={(e) => updatePromptInfo({ styleNotes: e.target.value })}
          placeholder="例如：每月只改日期和门店"
          style={{ minHeight: 40 }}
        />
      </div>

      <button className="topbar-btn" onClick={handleCopy} style={{ width: '100%' }}>
        {copied ? '✓ 已复制' : '复制 Prompt'}
      </button>
    </div>
  )
}

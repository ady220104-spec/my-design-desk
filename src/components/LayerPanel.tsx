import { useTemplateStore } from '../store/useTemplateStore'
import { sampleColor } from '../utils/color'
import type { TextLayer, MaskLayer } from '../types'

export function LayerPanel() {
  const template = useTemplateStore((s) => s.currentTemplate)
  const selectedLayerId = useTemplateStore((s) => s.selectedLayerId)
  const setSelectedLayer = useTemplateStore((s) => s.setSelectedLayer)
  const updateLayer = useTemplateStore((s) => s.updateLayer)
  const removeLayer = useTemplateStore((s) => s.removeLayer)
  const loadAssetUrl = useTemplateStore((s) => s.loadAssetUrl)

  if (!template) return null

  const selectedLayer = template.layers.find((l) => l.id === selectedLayerId)

  const handleSampleBg = async (mask: MaskLayer) => {
    const bg = template.layers.find((l) => l.type === 'background')
    if (!bg || bg.type !== 'background') return
    const url = await loadAssetUrl(bg.assetId)
    if (!url) return
    const fill = await sampleColor(
      url,
      template.canvas.width,
      template.canvas.height,
      mask.x + mask.width / 2,
      mask.y + mask.height / 2
    )
    updateLayer(mask.id, { fill })
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 8 }}>
        图层列表
      </div>

      {[...template.layers].reverse().map((layer) => {
        const icon = layer.type === 'background' ? '🖼' : layer.type === 'mask' ? '◼' : '𝐓'
        const name =
          layer.type === 'background'
            ? '底图'
            : layer.type === 'mask'
            ? '遮盖层'
            : (layer as TextLayer).text?.slice(0, 12) || '文字层'

        return (
          <div
            key={layer.id}
            className={`layer-item ${layer.id === selectedLayerId ? 'selected' : ''}`}
            onClick={() => setSelectedLayer(layer.id)}
          >
            <span className="layer-icon">{icon}</span>
            <span className="layer-name">{name}</span>
            {layer.locked && <span className="layer-lock">🔒</span>}
            {!layer.locked && (
              <button
                className="sm-btn danger"
                style={{ padding: '1px 4px', fontSize: 10 }}
                onClick={(e) => {
                  e.stopPropagation()
                  removeLayer(layer.id)
                }}
              >
                ×
              </button>
            )}
          </div>
        )
      })}

      {selectedLayer && selectedLayer.type !== 'background' && (
        <div style={{ marginTop: 16 }}>
          <div className="prop-section">
            <div className="prop-section-title">图层属性</div>

            {selectedLayer.type === 'text' && (
              <>
                <div className="prop-row">
                  <span className="prop-label">文字</span>
                  <input
                    className="prop-input"
                    value={(selectedLayer as TextLayer).text}
                    onChange={(e) => updateLayer(selectedLayer.id, { text: e.target.value })}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">字号</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as TextLayer).fontSize}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontSize: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                  <span className="prop-label">颜色</span>
                  <input
                    className="prop-color"
                    type="color"
                    value={(selectedLayer as TextLayer).color}
                    onChange={(e) => updateLayer(selectedLayer.id, { color: e.target.value })}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">字体</span>
                  <select
                    className="prop-input"
                    value={(selectedLayer as TextLayer).fontFamily}
                    onChange={(e) => updateLayer(selectedLayer.id, { fontFamily: e.target.value })}
                  >
                    <option value="Microsoft YaHei">微软雅黑</option>
                    <option value="SimHei">黑体</option>
                    <option value="SimSun">宋体</option>
                    <option value="KaiTi">楷体</option>
                    <option value="Arial">Arial</option>
                    <option value="sans-serif">sans-serif</option>
                  </select>
                </div>
                <div className="prop-row">
                  <span className="prop-label">X</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as TextLayer).x}
                    onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                  <span className="prop-label">Y</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as TextLayer).y}
                    onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                </div>
              </>
            )}

            {selectedLayer.type === 'mask' && (
              <>
                <div className="prop-row">
                  <span className="prop-label">颜色</span>
                  <input
                    className="prop-color"
                    type="color"
                    value={(selectedLayer as MaskLayer).fill}
                    onChange={(e) => updateLayer(selectedLayer.id, { fill: e.target.value })}
                  />
                  <span className="prop-label">透明</span>
                  <input
                    className="prop-input"
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={(selectedLayer as MaskLayer).opacity ?? 1}
                    onChange={(e) => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">X</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as MaskLayer).x}
                    onChange={(e) => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                  <span className="prop-label">Y</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as MaskLayer).y}
                    onChange={(e) => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                </div>
                <div className="prop-row">
                  <span className="prop-label">宽</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as MaskLayer).width}
                    onChange={(e) => updateLayer(selectedLayer.id, { width: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                  <span className="prop-label">高</span>
                  <input
                    className="prop-input"
                    type="number"
                    value={(selectedLayer as MaskLayer).height}
                    onChange={(e) => updateLayer(selectedLayer.id, { height: Number(e.target.value) })}
                    style={{ width: 60 }}
                  />
                </div>
                <div className="prop-row">
                  <button
                    className="sm-btn"
                    style={{ width: '100%' }}
                    onClick={() => handleSampleBg(selectedLayer as MaskLayer)}
                  >
                    吸取底图颜色（无痕融合）
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useCallback, useState } from 'react'
import * as fabric from 'fabric'
import { useTemplateStore } from '../store/useTemplateStore'
import { sampleColor } from '../utils/color'
import type { TextLayer, MaskLayer, Template } from '../types'

// Fabric v6 的对象类型未声明自定义 data 字段；我们用它把画布对象关联回图层 id。
declare module 'fabric' {
  interface FabricObject {
    data?: { layerId?: string }
  }
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1]

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fcRef = useRef<fabric.Canvas | null>(null)

  const [zoom, setZoom] = useState(0.5)
  const [bgMissing, setBgMissing] = useState(false)
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom

  const template = useTemplateStore((s) => s.currentTemplate)
  const selectedLayerId = useTemplateStore((s) => s.selectedLayerId)
  const setSelectedLayer = useTemplateStore((s) => s.setSelectedLayer)
  const updateLayer = useTemplateStore((s) => s.updateLayer)
  const loadAssetUrl = useTemplateStore((s) => s.loadAssetUrl)

  const getCanvas = useCallback(() => fcRef.current, [])

  useEffect(() => {
    if (!canvasRef.current || !template) return

    if (fcRef.current) {
      fcRef.current.dispose()
    }

    const S = zoom
    const fc = new fabric.Canvas(canvasRef.current, {
      width: template.canvas.width * S,
      height: template.canvas.height * S,
      backgroundColor: template.canvas.backgroundColor,
      selection: true,
    })
    fcRef.current = fc

    fc.on('selection:created', (e) => {
      const obj = e.selected?.[0]
      if (obj?.data?.layerId) setSelectedLayer(obj.data.layerId)
    })
    fc.on('selection:updated', (e) => {
      const obj = e.selected?.[0]
      if (obj?.data?.layerId) setSelectedLayer(obj.data.layerId)
    })
    fc.on('selection:cleared', () => setSelectedLayer(null))

    fc.on('object:modified', (e) => {
      const obj = e.target
      const layerId = obj?.data?.layerId
      if (!layerId) return
      const layer = template.layers.find((l) => l.id === layerId)
      if (!layer) return
      const S2 = zoomRef.current

      if (layer.type === 'text') {
        updateLayer(layer.id, {
          x: Math.round((obj.left || 0) / S2),
          y: Math.round((obj.top || 0) / S2),
        })
      } else if (layer.type === 'mask') {
        updateLayer(layer.id, {
          x: Math.round((obj.left || 0) / S2),
          y: Math.round((obj.top || 0) / S2),
          width: Math.round((((obj as fabric.Rect).width || 0) * (obj.scaleX || 1)) / S2),
          height: Math.round((((obj as fabric.Rect).height || 0) * (obj.scaleY || 1)) / S2),
        })
        obj.set({ scaleX: 1, scaleY: 1 })
      }
    })

    fc.on('text:changed', (e) => {
      const obj = e.target as fabric.IText
      if (!obj?.data?.layerId) return
      updateLayer(obj.data.layerId, { text: obj.text || '' })
    })

    // ② 拖拽时吸附到画布中心线 / 其他图层中心，并画出参考线，提升对齐手感
    let guides: { x?: number; y?: number }[] = []
    const SNAP = 6
    fc.on('object:moving', (e) => {
      const obj = e.target
      if (!obj) return
      guides = []
      const W = fc.getWidth()
      const H = fc.getHeight()
      const sw = obj.getScaledWidth()
      const sh = obj.getScaledHeight()
      const c = obj.getCenterPoint()
      const targets: { cx: number; cy: number }[] = [{ cx: W / 2, cy: H / 2 }]
      fc.getObjects().forEach((o) => {
        if (o !== obj && o.data?.layerId) {
          const oc = o.getCenterPoint()
          targets.push({ cx: oc.x, cy: oc.y })
        }
      })
      // 每个轴只吸附第一个命中的目标（targets[0] 是画布中心，优先级最高），
      // 避免多个目标都在阈值内时互相覆盖导致吸附点跳动。
      let snapX: number | null = null
      let snapY: number | null = null
      for (const t of targets) {
        if (snapX === null && Math.abs(c.x - t.cx) < SNAP) snapX = t.cx
        if (snapY === null && Math.abs(c.y - t.cy) < SNAP) snapY = t.cy
      }
      if (snapX !== null) {
        obj.set({ left: snapX - sw / 2 })
        guides.push({ x: snapX })
      }
      if (snapY !== null) {
        obj.set({ top: snapY - sh / 2 })
        guides.push({ y: snapY })
      }
    })
    fc.on('after:render', () => {
      if (!guides.length) return
      const ctx = fc.contextTop
      if (!ctx) return
      ctx.save()
      ctx.strokeStyle = '#4a9eff'
      ctx.lineWidth = 1
      for (const g of guides) {
        ctx.beginPath()
        if (g.x != null) {
          ctx.moveTo(g.x, 0)
          ctx.lineTo(g.x, fc.getHeight())
        }
        if (g.y != null) {
          ctx.moveTo(0, g.y)
          ctx.lineTo(fc.getWidth(), g.y)
        }
        ctx.stroke()
      }
      ctx.restore()
    })
    fc.on('mouse:up', () => {
      if (guides.length) {
        guides = []
        fc.requestRenderAll()
      }
    })

    // ① 双击画布空白处 → 在该位置创建遮盖层并自动吸取底图颜色，
    //    直接解决"新建遮盖默认居中、要手动挪到旧字上"的痛点。
    fc.on('mouse:dblclick', (opt) => {
      if (opt.target) return // 双击在对象上（如进入文字编辑）不建遮盖
      const pt = fc.getScenePoint(opt.e)
      const S2 = zoomRef.current
      const st = useTemplateStore.getState()
      const tpl = st.currentTemplate
      if (!tpl) return
      const w0 = 200
      const h0 = 60
      const x = Math.round(pt.x / S2 - w0 / 2)
      const y = Math.round(pt.y / S2 - h0 / 2)
      const id = `layer_mask_${Date.now().toString(36)}`
      st.addLayer({ id, type: 'mask', x, y, width: w0, height: h0, fill: '#000000', opacity: 1 })
      const bg = tpl.layers.find((l) => l.type === 'background')
      if (bg && bg.type === 'background') {
        st.loadAssetUrl(bg.assetId).then((url) => {
          if (url) {
            sampleColor(url, tpl.canvas.width, tpl.canvas.height, x + w0 / 2, y + h0 / 2).then((fill) =>
              st.updateLayer(id, { fill })
            )
          }
        })
      }
    })

    return () => {
      fc.dispose()
      fcRef.current = null
    }
  }, [template?.id, zoom])

  useEffect(() => {
    const fc = fcRef.current
    if (!fc || !template) return

    // 用「取消标志」做并发控制：effect 重跑时把上一次渲染标记为已取消，
    // 旧渲染在每个 await 之后自行退出，最新一次总能完整执行（修复加层后改属性的丢帧）。
    let cancelled = false
    const S = zoom

    const renderLayers = async () => {
      fc.clear()
      fc.backgroundColor = template.canvas.backgroundColor
      let anyBgMissing = false

      for (const layer of template.layers) {
        if (layer.type === 'background') {
          try {
            const url = await loadAssetUrl(layer.assetId)
            if (cancelled) return
            if (!url) {
              anyBgMissing = true
              continue
            }
            const img = await fabric.FabricImage.fromURL(url)
            if (cancelled) return
            img.set({
              left: 0,
              top: 0,
              scaleX: (template.canvas.width * S) / (img.width || 1),
              scaleY: (template.canvas.height * S) / (img.height || 1),
              selectable: false,
              evented: false,
              data: { layerId: layer.id },
            })
            fc.add(img)
          } catch {
            // asset missing
          }
        } else if (layer.type === 'mask') {
          fc.add(
            new fabric.Rect({
              left: layer.x * S,
              top: layer.y * S,
              width: layer.width * S,
              height: layer.height * S,
              fill: layer.fill,
              opacity: layer.opacity ?? 1,
              data: { layerId: layer.id },
              cornerColor: '#4a9eff',
              cornerSize: 8,
              transparentCorners: false,
            })
          )
        } else if (layer.type === 'text') {
          fc.add(
            new fabric.IText(layer.text, {
              left: layer.x * S,
              top: layer.y * S,
              fontSize: layer.fontSize * S,
              fontFamily: layer.fontFamily,
              fill: layer.color,
              textAlign: layer.align,
              fontWeight: layer.fontWeight || 'normal',
              data: { layerId: layer.id },
              cornerColor: '#4a9eff',
              cornerSize: 8,
              transparentCorners: false,
              editable: true,
            })
          )
        }
      }

      if (cancelled) return
      setBgMissing(anyBgMissing)
      fc.renderAll()

      if (selectedLayerId) {
        const obj = fc.getObjects().find((o) => o.data?.layerId === selectedLayerId)
        if (obj) {
          fc.setActiveObject(obj)
          fc.renderAll()
        }
      }
    }

    renderLayers()
    return () => {
      cancelled = true
    }
  }, [template?.layers, template?.canvas, template?.id, zoom])

  // expose getCanvas for export
  useEffect(() => {
    ;(window as any).__designDeskCanvas = getCanvas
  }, [getCanvas])

  if (!template) {
    return (
      <div className="center-panel">
        <div className="canvas-area">
          <div className="canvas-empty">
            <div style={{ fontSize: 48, opacity: 0.3 }}>🎨</div>
            <div>请从左侧选择一个模板，或新建模板</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="center-panel">
      <CanvasToolbar zoom={zoom} setZoom={setZoom} />
      {bgMissing && (
        <div style={{ padding: '6px 12px', background: 'rgba(239,68,68,0.15)', color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>
          ⚠ 底图缺失，请重新绑定图片后再导出
        </div>
      )}
      <div className="canvas-area">
        <div
          className="canvas-wrapper"
          style={{
            width: template.canvas.width * zoom,
            height: template.canvas.height * zoom,
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  )
}

function CanvasToolbar({ zoom, setZoom }: { zoom: number; setZoom: (z: number) => void }) {
  const template = useTemplateStore((s) => s.currentTemplate)
  const addLayer = useTemplateStore((s) => s.addLayer)
  const addField = useTemplateStore((s) => s.addField)
  const updateLayer = useTemplateStore((s) => s.updateLayer)
  const loadAssetUrl = useTemplateStore((s) => s.loadAssetUrl)

  const handleAddText = () => {
    if (!template) return
    const id = `layer_text_${Date.now().toString(36)}`
    const fieldId = `field_${Date.now().toString(36)}`
    const layer: TextLayer = {
      id,
      type: 'text',
      fieldId,
      text: '新文字',
      x: Math.round(template.canvas.width / 2 - 60),
      y: Math.round(template.canvas.height / 2),
      fontSize: 40,
      fontFamily: 'Microsoft YaHei',
      color: '#ffffff',
      align: 'center',
    }
    addLayer(layer)
    addField({ id: fieldId, label: '新字段', type: 'text', value: '新文字', required: false, layerId: id })
  }

  const handleAddMask = async () => {
    if (!template) return
    const id = `layer_mask_${Date.now().toString(36)}`
    const x = Math.round(template.canvas.width / 2 - 100)
    const y = Math.round(template.canvas.height / 2)
    const width = 200
    const height = 60
    addLayer({ id, type: 'mask', x, y, width, height, fill: '#000000', opacity: 1 } as MaskLayer)

    const bg = template.layers.find((l) => l.type === 'background')
    if (bg && bg.type === 'background') {
      try {
        const url = await loadAssetUrl(bg.assetId)
        if (url) {
          const fill = await sampleColor(url, template.canvas.width, template.canvas.height, x + width / 2, y + height / 2)
          updateLayer(id, { fill })
        }
      } catch {
        // 取色失败保留默认色
      }
    }
  }

  const idx = ZOOM_LEVELS.indexOf(zoom)
  const safeIdx = idx === -1 ? 1 : idx
  const dec = () => setZoom(ZOOM_LEVELS[Math.max(0, safeIdx - 1)])
  const inc = () => setZoom(ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, safeIdx + 1)])

  return (
    <div className="canvas-toolbar">
      <button className="tool-btn" onClick={handleAddText}>+ 文字层</button>
      <button className="tool-btn" onClick={handleAddMask}>+ 遮盖层</button>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>双击空白处可在该处加遮盖</span>
      <div style={{ flex: 1 }} />
      <button className="tool-btn" onClick={dec} disabled={safeIdx === 0}>−</button>
      <span style={{ fontSize: 12, minWidth: 42, textAlign: 'center' }}>{Math.round(zoom * 100)}%</span>
      <button className="tool-btn" onClick={inc} disabled={safeIdx === ZOOM_LEVELS.length - 1}>+</button>
      {template && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>
          {template.canvas.width} × {template.canvas.height}
        </span>
      )}
    </div>
  )
}

// 通用渲染：用独立离屏 StaticCanvas 渲染一份模板到 dataURL。
// fieldValues 可覆盖文字层内容（批量导出按期套用不同字段值）。
// 屏幕预览、单张导出、批量导出都走这一套逻辑，保证三者像素一致。
export async function renderTemplateToDataURL(
  template: Template,
  fieldValues?: Record<string, string>,
  format: 'png' | 'jpeg' = 'png',
  quality = 1
): Promise<string> {
  // 等字体加载完成，避免不同机器中文字体未就绪导致导出字形/换行与预览不一致
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // 忽略字体等待失败，按当前可用字体导出
    }
  }
  const store = useTemplateStore.getState()
  const exportCanvas = new fabric.StaticCanvas(undefined, {
    width: template.canvas.width,
    height: template.canvas.height,
    backgroundColor: template.canvas.backgroundColor,
  })

  for (const layer of template.layers) {
    if (layer.type === 'background') {
      const url = await store.loadAssetUrl(layer.assetId)
      if (!url) continue
      const img = await fabric.FabricImage.fromURL(url)
      img.set({
        left: 0,
        top: 0,
        scaleX: template.canvas.width / (img.width || 1),
        scaleY: template.canvas.height / (img.height || 1),
      })
      exportCanvas.add(img)
    } else if (layer.type === 'mask') {
      exportCanvas.add(
        new fabric.Rect({
          left: layer.x,
          top: layer.y,
          width: layer.width,
          height: layer.height,
          fill: layer.fill,
          opacity: layer.opacity ?? 1,
        })
      )
    } else if (layer.type === 'text') {
      const value =
        layer.fieldId && fieldValues && layer.fieldId in fieldValues
          ? fieldValues[layer.fieldId]
          : layer.text
      exportCanvas.add(
        new fabric.FabricText(value, {
          left: layer.x,
          top: layer.y,
          fontSize: layer.fontSize,
          fontFamily: layer.fontFamily,
          fill: layer.color,
          textAlign: layer.align,
          fontWeight: layer.fontWeight || 'normal',
        })
      )
    }
  }

  exportCanvas.renderAll()
  const dataUrl = exportCanvas.toDataURL({ format, multiplier: 1, quality })
  exportCanvas.dispose()
  return dataUrl
}

export function getExportCanvas(format: 'png' | 'jpeg' = 'png', quality = 1): Promise<string> {
  const template = useTemplateStore.getState().currentTemplate
  if (!template) return Promise.reject(new Error('No template'))
  return renderTemplateToDataURL(template, undefined, format, quality)
}

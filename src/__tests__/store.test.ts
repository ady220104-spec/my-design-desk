import { describe, it, expect, beforeEach } from 'vitest'
import { useTemplateStore } from '../store/useTemplateStore'
import type { Template, TextLayer } from '../types'

function makeTemplate(): Template {
  return {
    id: 'tpl_test',
    name: 'T',
    tags: [],
    canvas: { width: 100, height: 100, backgroundColor: '#fff' },
    promptInfo: { modelName: '', prompt: '', negativePrompt: '', styleNotes: '' },
    layers: [
      { id: 'bg', type: 'background', assetId: 'a1', locked: true },
      { id: 'tx', type: 'text', fieldId: 'f1', text: 'old', x: 0, y: 0, fontSize: 10, fontFamily: 'A', color: '#000', align: 'left' },
    ],
    fields: [{ id: 'f1', label: '日期', type: 'text', value: 'old', required: true, layerId: 'tx' }],
    versions: [],
    createdAt: '',
    updatedAt: '',
  }
}

const S = () => useTemplateStore.getState()
const textLayer = () => S().currentTemplate!.layers.find((l) => l.id === 'tx') as TextLayer

beforeEach(() => {
  S().setTemplate(makeTemplate())
})

describe('字段 → 图层联动', () => {
  it('改字段会同步更新绑定的文字层', () => {
    S().updateField('f1', 'new')
    expect(S().currentTemplate!.fields[0].value).toBe('new')
    expect(textLayer().text).toBe('new')
  })
})

describe('撤销 / 重做', () => {
  it('加层后可撤销、可重做', () => {
    const before = S().currentTemplate!.layers.length
    S().addLayer({ id: 'm1', type: 'mask', x: 0, y: 0, width: 10, height: 10, fill: '#000', opacity: 1 })
    expect(S().currentTemplate!.layers.length).toBe(before + 1)
    S().undo()
    expect(S().currentTemplate!.layers.length).toBe(before)
    S().redo()
    expect(S().currentTemplate!.layers.length).toBe(before + 1)
  })
})

describe('历史版本', () => {
  it('恢复版本会回滚字段值并联动图层', () => {
    S().saveVersion('v1') // 快照此刻 f1 = 'old'
    S().updateField('f1', 'changed')
    expect(textLayer().text).toBe('changed')
    const verId = S().currentTemplate!.versions[0].id
    S().restoreVersion(verId)
    expect(S().currentTemplate!.fields[0].value).toBe('old')
    expect(textLayer().text).toBe('old')
  })
})

describe('字段绑定', () => {
  it('绑定后字段值写入文字层', () => {
    // 新增一个未绑定字段，绑定到已有文字层
    S().addField({ id: 'f2', label: '副标题', type: 'text', value: '你好', required: false })
    S().bindFieldToLayer('f2', 'tx')
    expect(S().currentTemplate!.fields.find((f) => f.id === 'f2')!.layerId).toBe('tx')
    expect(textLayer().text).toBe('你好')
  })
})

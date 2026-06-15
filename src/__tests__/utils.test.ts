import { describe, it, expect } from 'vitest'
import { base64ToBlob } from '../utils/export'
import { generateId } from '../utils/id'

describe('base64ToBlob', () => {
  it('正确解析 data URL 的 MIME 与字节', () => {
    const b64 = 'data:text/plain;base64,' + Buffer.from('hi').toString('base64')
    const blob = base64ToBlob(b64)
    expect(blob.type).toBe('text/plain')
    expect(blob.size).toBe(2)
  })

  it('识别 PNG MIME', () => {
    const b64 = 'data:image/png;base64,' + Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
    expect(base64ToBlob(b64).type).toBe('image/png')
  })
})

describe('generateId', () => {
  it('带前缀且基本不重复', () => {
    const a = generateId('tpl')
    const b = generateId('tpl')
    expect(a.startsWith('tpl_')).toBe(true)
    expect(a).not.toBe(b)
  })
})

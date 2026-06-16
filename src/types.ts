export interface CanvasConfig {
  width: number
  height: number
  backgroundColor: string
}

export interface PromptInfo {
  modelName: string
  prompt: string
  negativePrompt: string
  styleNotes: string
}

export interface BaseLayer {
  id: string
  type: string
  locked?: boolean
}

export interface BackgroundLayer extends BaseLayer {
  type: 'background'
  assetId: string
  locked: true
}

export interface MaskLayer extends BaseLayer {
  type: 'mask'
  x: number
  y: number
  width: number
  height: number
  fill: string
  opacity?: number
}

export interface TextLayer extends BaseLayer {
  type: 'text'
  fieldId?: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  color: string
  align: 'left' | 'center' | 'right'
  fontWeight?: string
}

export type Layer = BackgroundLayer | MaskLayer | TextLayer

export interface Field {
  id: string
  label: string
  type: 'text'
  value: string
  required: boolean
  layerId?: string
}

export interface Version {
  id: string
  name: string
  createdAt: string
  fieldSnapshot: Record<string, string>
}

export interface Asset {
  id: string
  type: 'image'
  name: string
  mimeType: string
  blob?: Blob
  base64?: string
}

export interface FieldPreset {
  presetName: string
  suggestedFields: string[]
}

export interface Template {
  id: string
  name: string
  templateType?: string
  tags: string[]
  canvas: CanvasConfig
  promptInfo: PromptInfo
  layers: Layer[]
  fields: Field[]
  fieldPreset?: FieldPreset
  versions: Version[]
  createdAt: string
  updatedAt: string
}

export interface TemplateDocument {
  version: string
  template: Template
  assets: Asset[]
}

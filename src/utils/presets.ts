// 模板类型与默认字段预设（依据桌面 MVP PRD 第 1.4 / 3.7 节的素材样本分类）。
// 仅用于「创建模板时起步建议」与「模板库筛选」，不强制最终字段。

export const UNCATEGORIZED = '未分类'

// 五类常见素材类型，顺序即筛选条 / 选择器的展示顺序
export const TEMPLATE_TYPES = [
  '横版活动海报',
  '课程表',
  '竖版启动仪式',
  '导师介绍',
  '宣誓证书',
] as const

export type TemplateType = (typeof TEMPLATE_TYPES)[number]

// 各类型的默认推荐字段（用户可增删）
export const TEMPLATE_PRESETS: Record<string, string[]> = {
  横版活动海报: ['团名', '活动日期', '收益数字', '权益文案', '讲师名'],
  课程表: ['时间段', '课程标题', '讲师', '每日主题'],
  竖版启动仪式: ['活动标题', '活动日期', '团名', '地点', '底部信息'],
  导师介绍: ['姓名', '头衔', '简介', '课程主题'],
  宣誓证书: ['标题', '正文', '姓名', '日期'],
}

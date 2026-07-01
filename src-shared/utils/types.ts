// 前后端共享类型定义

/** 知识库 */
export interface KnowledgeBase {
  id: string
  name: string
  description: string
  isDefault: boolean
  createdAt: number
  documentCount?: number
  /** 关联的部门 id 列表（管理端返回） */
  departmentIds?: string[]
}

/** 部门 */
export interface Department {
  id: string
  name: string
  createdAt: number
  /** 该部门下的用户数（管理端返回） */
  userCount?: number
}

/** 文档元信息 */
export interface DocumentInfo {
  id: string
  knowledgeBaseId: string
  name: string
  originalName: string
  ext: string
  mimeType: string
  size: number
  language: string
  createdAt: number
}

/** 文档完整内容（含解析文本） */
export interface DocumentFull extends DocumentInfo {
  content: string
}

/** 搜索结果（搜索工具返回给助手） */
export interface SearchResult {
  id: string
  name: string
  knowledgeBaseId: string
  knowledgeBaseName: string
  /** 高亮匹配片段，匹配词用 <mark></mark> 包裹 */
  snippet: string
  /** 文档页面链接 /doc/:id */
  url: string
}

/** AI 服务商 */
export interface Provider {
  id: string
  name: string
  baseUrl: string
  /** apiKey 永不返回客户端，仅服务端可见 */
  hasApiKey?: boolean
  enabled: boolean
  createdAt: number
}

/** 模型 */
export interface Model {
  id: string
  providerId: string
  name: string
  label: string
  isDefault: boolean
  createdAt: number
  providerName?: string
}

/** 全局设置 */
export interface GlobalSettings {
  defaultModelName: string | null
  defaultKnowledgeBaseId: string | null
}

/** 客户端公开配置（用户端启动时拉取） */
export interface PublicConfig {
  siteName: string
  hasAdmin: boolean
}

/** 反馈评分：1 好评 / -1 差评 */
export type FeedbackRating = 1 | -1

/** 用户对助手回答的反馈 */
export interface Feedback {
  messageId: string
  userId: string
  knowledgeBaseIds: string[]
  modelName: string | null
  rating: FeedbackRating
  createdAt: number
}

/** 调用日志类型 */
export type CallType = 'model' | 'kb'

/** 调用日志 */
export interface CallLog {
  id: string
  type: CallType
  userId: string | null
  modelName?: string | null
  knowledgeBaseIds?: string[] | null
  query?: string | null
  resultCount?: number | null
  durationMs: number
  success: boolean
  createdAt: number
}

/** 概览统计 */
export interface OverviewStats {
  documentCount: number
  userCount: number
  knowledgeBaseCount: number
  departmentCount: number
  modelCallCount: number
  kbCallCount: number
  totalFeedback: number
  positiveFeedback: number
  /** 整体满意度（好评率），无反馈时为 null */
  satisfaction: number | null
}

/** 调用量时间序列：每个时间桶一条记录，series 为各分段（知识库或模型）名称到数量的映射 */
export interface CallSeriesPoint {
  bucket: string
  counts: Record<string, number>
}

/** 调用量序列响应 */
export interface CallSeries {
  /** 分段的 key 列表（知识库 id 或 模型名） */
  keys: string[]
  /** key -> 展示名 */
  labels: Record<string, string>
  points: CallSeriesPoint[]
}

/** 每个知识库的满意度 */
export interface KbSatisfaction {
  knowledgeBaseId: string
  name: string
  positive: number
  negative: number
  /** 好评率，无反馈为 null */
  rate: number | null
}

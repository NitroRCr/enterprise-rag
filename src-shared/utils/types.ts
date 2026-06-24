// 前后端共享类型定义

/** 知识库 */
export interface KnowledgeBase {
  id: string
  name: string
  description: string
  isDefault: boolean
  createdAt: number
  documentCount?: number
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

// 客户端本地对话数据类型（存储于 IndexedDB）

export interface ToolCallRecord {
  id: string
  name: string
  args: Record<string, unknown>
  status: 'calling' | 'completed' | 'failed'
  /** 工具返回结果（搜索结果或文档内容），用于 UI 展示 */
  result?: unknown
  error?: string
}

export interface Message {
  id: string
  dialogId: string
  role: 'user' | 'assistant'
  content: string
  reasoning?: string
  toolCalls?: ToolCallRecord[]
  error?: string
  createdAt: number
}

export interface Dialog {
  id: string
  title: string
  knowledgeBaseIds: string[]
  modelName: string | null
  createdAt: number
  updatedAt: number
}

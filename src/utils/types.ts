// 客户端本地对话数据类型（存储于 IndexedDB）
// 参照 AIaW 的数据层：对话以消息树（msgTree）组织，支持分支；
// 路由 msgRoute 采用 nyaai 的 Record<string, number> 形式，以实现「下层分支记忆」。

/** 用户消息内容块 */
export interface UserMessageContent {
  type: 'user-message'
  text: string
  /** 关联的附件条目（图片/文件）id 列表，对应 StoredItem */
  items: string[]
}

/** 助手文本内容块 */
export interface AssistantMessageContent {
  type: 'assistant-message'
  text: string
  reasoning?: string
}

/** 助手工具调用内容块（RAG：search / get_documents） */
export interface AssistantToolContent {
  type: 'assistant-tool'
  /** AI SDK 的 toolCallId，用于结果回填与上下文重建 */
  toolCallId: string
  name: string
  args: Record<string, unknown>
  /** 工具返回结果（搜索结果或文档内容），用于 UI 展示 */
  result?: unknown
  status: 'calling' | 'completed' | 'failed'
  error?: string
}

export type MessageContent = UserMessageContent | AssistantMessageContent | AssistantToolContent

/** 附件条目：图片、文件、引用文本等，独立存储以便多分支共享 */
export interface StoredItem {
  id: string
  dialogId: string
  type: 'text' | 'file' | 'image'
  name?: string
  mimeType?: string
  /** 文本内容（文本文件 / 引用） */
  contentText?: string
  /** 二进制内容（图片 / 文件） */
  contentBuffer?: ArrayBuffer
  /** 被多少条消息引用，归零时删除 */
  references: number
}

export interface Message {
  id: string
  dialogId: string
  type: 'user' | 'assistant'
  contents: MessageContent[]
  status: 'inputing' | 'pending' | 'streaming' | 'default' | 'failed'
  error?: string
  /** 生成该消息所用模型名 */
  modelName?: string
  createdAt: number
}

export interface Dialog {
  id: string
  title: string
  knowledgeBaseIds: string[]
  modelName: string | null
  /** 消息树：父节点 id -> 子节点 id 列表，根节点为 '$root' */
  msgTree: Record<string, string[]>
  /** 分支路由：节点 id -> 选中的子分支下标（记忆每个节点的分支选择） */
  msgRoute: Record<string, number>
  createdAt: number
  updatedAt: number
}

/** 消息根节点 id */
export const ROOT = '$root'

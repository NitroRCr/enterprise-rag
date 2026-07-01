import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core'

// ───────────────────────── 业务表 ─────────────────────────

/** 部门 */
export const department = sqliteTable('department', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  createdAt: integer('created_at').notNull()
})

/** 知识库 ↔ 部门 多对多关联 */
export const knowledgeBaseDepartment = sqliteTable('knowledge_base_department', {
  knowledgeBaseId: text('knowledge_base_id').notNull(),
  departmentId: text('department_id').notNull()
}, t => [
  primaryKey({ columns: [t.knowledgeBaseId, t.departmentId] })
])

/** 知识库 */
export const knowledgeBase = sqliteTable('knowledge_base', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull()
})

/** 文档 */
export const document = sqliteTable('document', {
  id: text('id').primaryKey(),
  knowledgeBaseId: text('knowledge_base_id').notNull(),
  /** 展示用文档名（默认取原文件名，可编辑） */
  name: text('name').notNull(),
  /** 上传时的原始文件名 */
  originalName: text('original_name').notNull(),
  ext: text('ext').notNull().default(''),
  mimeType: text('mime_type').notNull().default(''),
  size: integer('size').notNull().default(0),
  /** 解析后内容的语言/格式标识：markdown | html | text */
  language: text('language').notNull().default('text'),
  /** 解析后的全文内容（用于展示与全文搜索） */
  content: text('content').notNull().default(''),
  /** 原始文件在文件系统中的相对路径 */
  filePath: text('file_path').notNull().default(''),
  createdAt: integer('created_at').notNull()
})

/** AI 服务商 */
export const provider = sqliteTable('provider', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  baseUrl: text('base_url').notNull(),
  apiKey: text('api_key').notNull().default(''),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull()
})

/** 模型（关联服务商） */
export const model = sqliteTable('model', {
  id: text('id').primaryKey(),
  providerId: text('provider_id').notNull(),
  /** 上游真实模型名（转发时使用） */
  name: text('name').notNull(),
  /** 展示名 */
  label: text('label').notNull().default(''),
  isDefault: integer('is_default', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull()
})

/** 全局设置（单行，id 固定为 'global'） */
export const globalSettings = sqliteTable('global_settings', {
  id: text('id').primaryKey(),
  defaultModelName: text('default_model_name'),
  defaultKnowledgeBaseId: text('default_knowledge_base_id')
})

/** 用户对助手回答的反馈（messageId 为客户端助手消息 id，唯一） */
export const feedback = sqliteTable('feedback', {
  messageId: text('message_id').primaryKey(),
  userId: text('user_id').notNull(),
  /** 该对话使用的知识库 id 列表（JSON 字符串） */
  knowledgeBaseIds: text('knowledge_base_ids').notNull().default('[]'),
  modelName: text('model_name'),
  /** 1 = 好评，-1 = 差评 */
  rating: integer('rating').notNull(),
  createdAt: integer('created_at').notNull()
})

/** 调用日志（模型调用 / 知识库检索调用），用于可观测性统计 */
export const callLog = sqliteTable('call_log', {
  id: text('id').primaryKey(),
  /** 'model' | 'kb' */
  type: text('type').notNull(),
  userId: text('user_id'),
  modelName: text('model_name'),
  /** 知识库 id 列表（JSON 字符串） */
  knowledgeBaseIds: text('knowledge_base_ids'),
  query: text('query'),
  resultCount: integer('result_count'),
  durationMs: integer('duration_ms').notNull().default(0),
  success: integer('success', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at').notNull()
})

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ───────────────────────── 业务表 ─────────────────────────

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

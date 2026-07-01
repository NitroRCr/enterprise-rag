import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// better-auth 表结构（含 admin 插件字段）。列名与 better-auth 默认 fieldName 保持一致。

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  // admin 插件
  role: text('role'),
  banned: integer('banned', { mode: 'boolean' }),
  banReason: text('banReason'),
  banExpires: integer('banExpires', { mode: 'timestamp' }),
  // 业务字段：所属部门（单一部门，可空）
  departmentId: text('departmentId')
})

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  // admin 插件
  impersonatedBy: text('impersonatedBy')
})

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
})

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull()
})

// ───────────── OIDC / MCP OAuth 表（better-auth mcp 插件依赖）─────────────

export const oauthApplication = sqliteTable('oauthApplication', {
  id: text('id').primaryKey(),
  name: text('name'),
  icon: text('icon'),
  metadata: text('metadata'),
  clientId: text('clientId').unique(),
  clientSecret: text('clientSecret'),
  redirectUrls: text('redirectUrls'),
  type: text('type'),
  disabled: integer('disabled', { mode: 'boolean' }),
  userId: text('userId'),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
})

export const oauthAccessToken = sqliteTable('oauthAccessToken', {
  id: text('id').primaryKey(),
  accessToken: text('accessToken').unique(),
  refreshToken: text('refreshToken').unique(),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  clientId: text('clientId'),
  userId: text('userId'),
  scopes: text('scopes'),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
})

export const oauthConsent = sqliteTable('oauthConsent', {
  id: text('id').primaryKey(),
  clientId: text('clientId'),
  userId: text('userId'),
  scopes: text('scopes'),
  consentGiven: integer('consentGiven', { mode: 'boolean' }),
  createdAt: integer('createdAt', { mode: 'timestamp' }),
  updatedAt: integer('updatedAt', { mode: 'timestamp' })
})

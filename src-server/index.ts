import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { mkdirSync } from 'node:fs'
import { oAuthDiscoveryMetadata, oAuthProtectedResourceMetadata } from 'better-auth/plugins'
import { auth } from './auth/auth'
import authRoutes from './auth/routes'
import knowledgeBases from './routes/knowledge-bases'
import documents from './routes/documents'
import search from './routes/search'
import providers from './routes/providers'
import models from './routes/models'
import settings from './routes/settings'
import departments from './routes/departments'
import feedback from './routes/feedback'
import analytics from './routes/analytics'
import mcp from './routes/mcp'
import ai from './routes/ai'
import { seed } from './utils/seed'
import { sizeBytes } from 'app/src-shared/utils/functions'
import { PORT, UPLOAD_DIR } from './utils/config'

mkdirSync(UPLOAD_DIR, { recursive: true })
await seed()

export const app = new Hono()
  .basePath('/api')
  .use(logger())
  .route('/auth', authRoutes)
  .route('/knowledge-bases', knowledgeBases)
  .route('/documents', documents)
  .route('/search', search)
  .route('/providers', providers)
  .route('/models', models)
  .route('/settings', settings)
  .route('/departments', departments)
  .route('/feedback', feedback)
  .route('/analytics', analytics)
  .route('/mcp', mcp)
  .route('/v1', ai)

export type AppType = typeof app

// 根级 OAuth Discovery（MCP 客户端在源站根路径探测 well-known），委托给 better-auth
const root = new Hono()
  .get('/.well-known/oauth-authorization-server', c => oAuthDiscoveryMetadata(auth)(c.req.raw))
  .get('/.well-known/oauth-protected-resource', c => oAuthProtectedResourceMetadata(auth)(c.req.raw))
  .get('/.well-known/oauth-protected-resource/api/mcp', c => oAuthProtectedResourceMetadata(auth)(c.req.raw))
  .route('/', app)

export default {
  port: PORT,
  fetch: root.fetch,
  maxRequestBodySize: sizeBytes('1G'),
  idleTimeout: 0
}

console.log(`Server running on http://localhost:${PORT}`)

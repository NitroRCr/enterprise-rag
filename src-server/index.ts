import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { mkdirSync } from 'node:fs'
import authRoutes from './auth/routes'
import knowledgeBases from './routes/knowledge-bases'
import documents from './routes/documents'
import search from './routes/search'
import providers from './routes/providers'
import models from './routes/models'
import settings from './routes/settings'
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
  .route('/v1', ai)

export type AppType = typeof app

export default {
  port: PORT,
  fetch: app.fetch,
  maxRequestBodySize: sizeBytes('1G'),
  idleTimeout: 0
}

console.log(`Server running on http://localhost:${PORT}`)

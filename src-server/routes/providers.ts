import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { desc, eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { provider } from '../schema'
import { genId } from 'app/src-shared/utils/id'
import { requireAdmin, type AuthEnv } from '../utils/auth-guard'

const app = new Hono<AuthEnv>()
  .get('/', requireAdmin, async c => {
    const rows = await db.select().from(provider).orderBy(desc(provider.createdAt))
    return c.json(rows.map(r => ({
      id: r.id,
      name: r.name,
      baseUrl: r.baseUrl,
      hasApiKey: !!r.apiKey,
      enabled: r.enabled,
      createdAt: r.createdAt
    })))
  })
  .post('/', requireAdmin, zValidator('json', z.object({
    name: z.string().min(1),
    baseUrl: z.string().min(1),
    apiKey: z.string().default(''),
    enabled: z.boolean().default(true)
  })), async c => {
    const { name, baseUrl, apiKey, enabled } = c.req.valid('json')
    const id = genId()
    await db.insert(provider).values({ id, name, baseUrl, apiKey, enabled, createdAt: Date.now() })
    return c.json({ id })
  })
  .patch('/:id', requireAdmin, zValidator('json', z.object({
    name: z.string().min(1).optional(),
    baseUrl: z.string().min(1).optional(),
    apiKey: z.string().optional(),
    enabled: z.boolean().optional()
  })), async c => {
    const id = c.req.param('id')
    const patch = c.req.valid('json')
    // 空字符串 apiKey 表示不修改
    if (patch.apiKey === '') delete patch.apiKey
    await db.update(provider).set(patch).where(eq(provider.id, id))
    return c.json({ ok: true })
  })
  .delete('/:id', requireAdmin, async c => {
    const id = c.req.param('id')
    await db.delete(provider).where(eq(provider.id, id))
    return c.json({ ok: true })
  })

export default app

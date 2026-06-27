import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { desc, eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { model, provider } from '../schema'
import { genId } from 'app/src-shared/utils/id'
import { requireAdmin, requireAuth, type AuthEnv } from '../utils/auth-guard'
import { updateGlobalSettings } from '../utils/seed'

const app = new Hono<AuthEnv>()
  // 模型列表（登录用户可读，含服务商名）
  .get('/', requireAuth, async c => {
    const rows = await db
      .select({
        id: model.id,
        providerId: model.providerId,
        name: model.name,
        label: model.label,
        isDefault: model.isDefault,
        createdAt: model.createdAt,
        providerName: provider.name,
        providerEnabled: provider.enabled
      })
      .from(model)
      .leftJoin(provider, eq(model.providerId, provider.id))
      .orderBy(desc(model.isDefault), desc(model.createdAt))
    return c.json(rows.map(r => ({
      id: r.id,
      providerId: r.providerId,
      name: r.name,
      label: r.label,
      isDefault: r.isDefault,
      createdAt: r.createdAt,
      providerName: r.providerName ?? '',
      providerEnabled: r.providerEnabled ?? false
    })))
  })
  .post('/', requireAdmin, zValidator('json', z.object({
    providerId: z.string().min(1),
    name: z.string().min(1),
    label: z.string().default('')
  })), async c => {
    const { providerId, name, label } = c.req.valid('json')
    const id = genId()
    const total = await db.$count(model)
    const isDefault = total === 0
    await db.insert(model).values({ id, providerId, name, label: label || name, isDefault, createdAt: Date.now() })
    if (isDefault) await updateGlobalSettings({ defaultModelName: name })
    return c.json({ id })
  })
  .patch('/:id', requireAdmin, zValidator('json', z.object({
    providerId: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    label: z.string().optional()
  })), async c => {
    const id = c.req.param('id')
    await db.update(model).set(c.req.valid('json')).where(eq(model.id, id))
    return c.json({ ok: true })
  })
  .post('/:id/default', requireAdmin, async c => {
    const id = c.req.param('id')
    const m = db.select().from(model).where(eq(model.id, id)).get()
    if (!m) return c.json({ error: 'Not found' }, 404)
    await db.update(model).set({ isDefault: false })
    await db.update(model).set({ isDefault: true }).where(eq(model.id, id))
    await updateGlobalSettings({ defaultModelName: m.name })
    return c.json({ ok: true })
  })
  .delete('/:id', requireAdmin, async c => {
    const id = c.req.param('id')
    await db.delete(model).where(eq(model.id, id))
    return c.json({ ok: true })
  })

export default app

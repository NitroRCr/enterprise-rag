import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { document, knowledgeBase } from '../schema'
import { genId } from 'app/src-shared/utils/id'
import { requireAdmin, requireAuth, type AuthEnv } from '../utils/auth-guard'
import { updateGlobalSettings } from '../utils/seed'
import { rm } from 'node:fs/promises'
import { UPLOAD_DIR } from '../utils/config'
import { join } from 'node:path'

const app = new Hono<AuthEnv>()
  // 列出全部知识库（含文档数）
  .get('/', requireAuth, async c => {
    const rows = await db.select().from(knowledgeBase).orderBy(desc(knowledgeBase.isDefault), knowledgeBase.createdAt)
    const counts = await db
      .select({ kb: document.knowledgeBaseId, n: sql<number>`count(*)` })
      .from(document)
      .groupBy(document.knowledgeBaseId)
    const countMap = new Map(counts.map(r => [r.kb, Number(r.n)]))
    return c.json(rows.map(r => ({ ...r, documentCount: countMap.get(r.id) ?? 0 })))
  })
  // 创建知识库
  .post('/', requireAdmin, zValidator('json', z.object({
    name: z.string().min(1),
    description: z.string().default('')
  })), async c => {
    const { name, description } = c.req.valid('json')
    const id = genId()
    const total = await db.$count(knowledgeBase)
    const isDefault = total === 0
    await db.insert(knowledgeBase).values({ id, name, description, isDefault, createdAt: Date.now() })
    if (isDefault) await updateGlobalSettings({ defaultKnowledgeBaseId: id })
    return c.json({ id })
  })
  // 更新知识库
  .patch('/:id', requireAdmin, zValidator('json', z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional()
  })), async c => {
    const id = c.req.param('id')
    await db.update(knowledgeBase).set(c.req.valid('json')).where(eq(knowledgeBase.id, id))
    return c.json({ ok: true })
  })
  // 设为默认知识库
  .post('/:id/default', requireAdmin, async c => {
    const id = c.req.param('id')
    const kb = db.select().from(knowledgeBase).where(eq(knowledgeBase.id, id)).get()
    if (!kb) return c.json({ error: 'Not found' }, 404)
    await db.update(knowledgeBase).set({ isDefault: false })
    await db.update(knowledgeBase).set({ isDefault: true }).where(eq(knowledgeBase.id, id))
    await updateGlobalSettings({ defaultKnowledgeBaseId: id })
    return c.json({ ok: true })
  })
  // 删除知识库（含其文档与原文件）
  .delete('/:id', requireAdmin, async c => {
    const id = c.req.param('id')
    const docs = await db.select({ id: document.id }).from(document).where(eq(document.knowledgeBaseId, id))
    await db.delete(document).where(eq(document.knowledgeBaseId, id))
    await db.delete(knowledgeBase).where(eq(knowledgeBase.id, id))
    // 删除原文件目录
    await Promise.all(docs.map(d => rm(join(UPLOAD_DIR, d.id), { recursive: true, force: true }).catch(() => {})))
    return c.json({ ok: true })
  })

export default app

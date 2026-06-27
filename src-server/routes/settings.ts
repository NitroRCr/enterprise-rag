import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq, sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { user } from '../schema'
import { requireAdmin, requireAuth, type AuthEnv } from '../utils/auth-guard'
import { getGlobalSettings, updateGlobalSettings } from '../utils/seed'
import { SITE_NAME } from '../utils/config'

function adminCount() {
  const row = db.select({ n: sql<number>`count(*)` }).from(user).where(eq(user.role, 'admin')).get()
  return Number(row?.n ?? 0)
}

const app = new Hono<AuthEnv>()
  // 公开配置（用于登录页判断是否需要首位管理员）
  .get('/config', c => {
    return c.json({ siteName: SITE_NAME, hasAdmin: adminCount() > 0 })
  })
  // 首位用户领取管理员角色
  .post('/acquire-admin', requireAuth, async c => {
    if (adminCount() > 0) return c.json({ error: '管理员已存在' }, 403)
    const u = c.get('user')
    await db.update(user).set({ role: 'admin' }).where(eq(user.id, u.id))
    return c.json({ ok: true })
  })
  // 全局设置（登录可读）
  .get('/', requireAuth, async c => {
    const s = await getGlobalSettings()
    return c.json({ defaultModelName: s.defaultModelName, defaultKnowledgeBaseId: s.defaultKnowledgeBaseId })
  })
  // 更新全局设置（管理员）
  .put('/', requireAdmin, zValidator('json', z.object({
    defaultModelName: z.string().nullable().optional(),
    defaultKnowledgeBaseId: z.string().nullable().optional()
  })), async c => {
    await updateGlobalSettings(c.req.valid('json'))
    return c.json({ ok: true })
  })

export default app

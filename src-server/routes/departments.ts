import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { desc, eq, sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { department, knowledgeBaseDepartment, user } from '../schema'
import { genId } from 'app/src-shared/utils/id'
import { requireAdmin, type AuthEnv } from '../utils/auth-guard'

const app = new Hono<AuthEnv>()
  // 部门列表（含成员数）
  .get('/', requireAdmin, async c => {
    const rows = await db.select().from(department).orderBy(desc(department.createdAt))
    const counts = await db
      .select({ dept: user.departmentId, n: sql<number>`count(*)` })
      .from(user)
      .groupBy(user.departmentId)
    const countMap = new Map(counts.map(r => [r.dept, Number(r.n)]))
    return c.json(rows.map(r => ({ ...r, userCount: countMap.get(r.id) ?? 0 })))
  })
  // 创建部门
  .post('/', requireAdmin, zValidator('json', z.object({
    name: z.string().min(1)
  })), async c => {
    const { name } = c.req.valid('json')
    const id = genId()
    await db.insert(department).values({ id, name, createdAt: Date.now() })
    return c.json({ id })
  })
  // 重命名部门
  .patch('/:id', requireAdmin, zValidator('json', z.object({
    name: z.string().min(1)
  })), async c => {
    const id = c.req.param('id')
    await db.update(department).set(c.req.valid('json')).where(eq(department.id, id))
    return c.json({ ok: true })
  })
  // 删除部门（同时解除 KB 关联并清空成员归属）
  .delete('/:id', requireAdmin, async c => {
    const id = c.req.param('id')
    await db.delete(knowledgeBaseDepartment).where(eq(knowledgeBaseDepartment.departmentId, id))
    await db.update(user).set({ departmentId: null }).where(eq(user.departmentId, id))
    await db.delete(department).where(eq(department.id, id))
    return c.json({ ok: true })
  })
  // 设置某知识库关联的部门集合（全量覆盖）
  .put('/kb/:kbId', requireAdmin, zValidator('json', z.object({
    departmentIds: z.array(z.string()).default([])
  })), async c => {
    const kbId = c.req.param('kbId')
    const { departmentIds } = c.req.valid('json')
    await db.delete(knowledgeBaseDepartment).where(eq(knowledgeBaseDepartment.knowledgeBaseId, kbId))
    if (departmentIds.length) {
      await db.insert(knowledgeBaseDepartment).values(
        departmentIds.map(departmentId => ({ knowledgeBaseId: kbId, departmentId }))
      )
    }
    return c.json({ ok: true })
  })
  // 为用户分配部门（departmentId 可为 null 表示移除归属）
  .patch('/users/:userId', requireAdmin, zValidator('json', z.object({
    departmentId: z.string().nullable()
  })), async c => {
    const userId = c.req.param('userId')
    const { departmentId } = c.req.valid('json')
    await db.update(user).set({ departmentId }).where(eq(user.id, userId))
    return c.json({ ok: true })
  })
  // 全部用户的部门归属（userId -> departmentId），供用户管理页合并展示
  .get('/user-map', requireAdmin, async c => {
    const rows = await db.select({ id: user.id, departmentId: user.departmentId }).from(user)
    return c.json(rows)
  })

export default app

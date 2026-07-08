import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { user, department } from '../schema'
import { requireAuth, type AuthEnv } from '../utils/auth-guard'

const app = new Hono<AuthEnv>()
  // 当前登录用户的资料（含所属部门名称）
  .get('/', requireAuth, async c => {
    const u = c.get('user')
    const row = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        departmentId: user.departmentId,
        departmentName: department.name
      })
      .from(user)
      .leftJoin(department, eq(user.departmentId, department.id))
      .where(eq(user.id, u.id))
      .get()
    if (!row) return c.json({ error: '用户不存在' }, 404)
    return c.json({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role ?? 'user',
      createdAt: row.createdAt,
      department: row.departmentId ? { id: row.departmentId, name: row.departmentName ?? '' } : null
    })
  })

export default app

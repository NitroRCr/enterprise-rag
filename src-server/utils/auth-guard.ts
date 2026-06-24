import type { MiddlewareHandler } from 'hono'
import { auth } from '../auth/auth'

export type AuthUser = (typeof auth.$Infer.Session)['user']

export interface AuthEnv {
  Variables: {
    user: AuthUser
  }
}

/** 要求已登录 */
export const requireAuth: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  c.set('user', session.user)
  await next()
}

/** 要求管理员角色 */
export const requireAdmin: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: 'Unauthorized' }, 401)
  if (session.user.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  c.set('user', session.user)
  await next()
}

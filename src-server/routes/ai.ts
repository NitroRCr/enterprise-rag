import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { model, provider } from '../schema'
import { requireAuth, type AuthEnv } from '../utils/auth-guard'
import { logCall } from '../utils/observability'

const app = new Hono<AuthEnv>()
  .post('/chat/completions', requireAuth, zValidator('json', z.looseObject({
    model: z.string(),
    stream: z.boolean().optional()
  })), async c => {
    const body = c.req.valid('json')
    const modelName = body.model
    const userId = c.get('user').id

    // 按模型名查找对应服务商
    const row = db
      .select({ baseUrl: provider.baseUrl, apiKey: provider.apiKey, enabled: provider.enabled })
      .from(model)
      .leftJoin(provider, eq(model.providerId, provider.id))
      .where(eq(model.name, modelName))
      .get()

    if (!row || !row.baseUrl) return c.json({ error: 'Model not found' }, 400)
    if (!row.enabled) return c.json({ error: 'Provider disabled' }, 403)

    const baseUrl = row.baseUrl.replace(/\/$/, '')
    const started = performance.now()
    let upstream: Response
    try {
      upstream = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${row.apiKey}`
        },
        body: JSON.stringify(body)
      })
    } catch (err) {
      logCall({ type: 'model', userId, modelName, durationMs: performance.now() - started, success: false })
      throw err
    }

    // 记录模型调用（不消费响应体，保证 SSE 透传零改动）
    logCall({ type: 'model', userId, modelName, durationMs: performance.now() - started, success: upstream.ok })

    if (!upstream.ok || !upstream.body) {
      return new Response(upstream.body, { status: upstream.status })
    }

    // 流式 SSE 透传 / 非流式 JSON 透传
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || (body.stream ? 'text/event-stream' : 'application/json')
      }
    })
  })

export default app

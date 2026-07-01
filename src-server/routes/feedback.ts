import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { db } from '../utils/db'
import { feedback } from '../schema'
import { requireAuth, type AuthEnv } from '../utils/auth-guard'

const app = new Hono<AuthEnv>()
  // 提交 / 切换 / 取消反馈
  // 再次点击相同 rating 视为取消（删除）；不同 rating 覆盖；新反馈插入
  .post('/', requireAuth, zValidator('json', z.object({
    messageId: z.string().min(1),
    knowledgeBaseIds: z.array(z.string()).default([]),
    modelName: z.string().nullable().default(null),
    rating: z.union([z.literal(1), z.literal(-1)])
  })), async c => {
    const { messageId, knowledgeBaseIds, modelName, rating } = c.req.valid('json')
    const userId = c.get('user').id
    const existing = db.select().from(feedback).where(eq(feedback.messageId, messageId)).get()

    if (existing && existing.rating === rating) {
      await db.delete(feedback).where(eq(feedback.messageId, messageId))
      return c.json({ rating: null })
    }

    await db
      .insert(feedback)
      .values({
        messageId,
        userId,
        knowledgeBaseIds: JSON.stringify(knowledgeBaseIds),
        modelName,
        rating,
        createdAt: Date.now()
      })
      .onConflictDoUpdate({
        target: feedback.messageId,
        set: {
          userId,
          knowledgeBaseIds: JSON.stringify(knowledgeBaseIds),
          modelName,
          rating,
          createdAt: Date.now()
        }
      })
    return c.json({ rating })
  })

export default app

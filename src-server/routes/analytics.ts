import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { department, document, feedback, knowledgeBase, model, user } from '../schema'
import { requireAdmin, type AuthEnv } from '../utils/auth-guard'
import type { CallSeries, CallSeriesPoint, KbSatisfaction, OverviewStats } from 'app/src-shared/utils/types'

/** 时间桶格式与回溯范围 */
const GRANULARITY: Record<string, { fmt: string; sinceMs: number }> = {
  day: { fmt: '%Y-%m-%d', sinceMs: 30 * 24 * 3600 * 1000 },
  week: { fmt: '%Y-%W', sinceMs: 12 * 7 * 24 * 3600 * 1000 },
  month: { fmt: '%Y-%m', sinceMs: 365 * 24 * 3600 * 1000 }
}

const app = new Hono<AuthEnv>()
  // 概览统计卡片数据
  .get('/overview', requireAdmin, async c => {
    const count = (expr: ReturnType<typeof sql>) =>
      Number((db.get<{ n: number }>(expr))?.n ?? 0)

    const stats: OverviewStats = {
      documentCount: await db.$count(document),
      userCount: await db.$count(user),
      knowledgeBaseCount: await db.$count(knowledgeBase),
      departmentCount: await db.$count(department),
      modelCallCount: count(sql`SELECT count(*) AS n FROM call_log WHERE type = 'model'`),
      kbCallCount: count(sql`SELECT count(*) AS n FROM call_log WHERE type = 'kb'`),
      totalFeedback: await db.$count(feedback),
      positiveFeedback: count(sql`SELECT count(*) AS n FROM feedback WHERE rating = 1`),
      satisfaction: null
    }
    stats.satisfaction = stats.totalFeedback > 0
      ? stats.positiveFeedback / stats.totalFeedback
      : null
    return c.json(stats)
  })
  // 调用量时间序列（按知识库或模型分段）
  .get('/calls', requireAdmin, zValidator('query', z.object({
    granularity: z.enum(['day', 'week', 'month']).default('day'),
    dimension: z.enum(['kb', 'model']).default('kb')
  })), c => {
    const { granularity, dimension } = c.req.valid('query')
    const { fmt, sinceMs } = GRANULARITY[granularity]
    const since = Date.now() - sinceMs

    interface AggRow { bucket: string; k: string; n: number }
    let rows: AggRow[]
    const labels: Record<string, string> = {}

    if (dimension === 'model') {
      rows = db.all<AggRow>(sql`
        SELECT strftime(${fmt}, created_at / 1000, 'unixepoch', 'localtime') AS bucket,
               model_name AS k,
               count(*) AS n
        FROM call_log
        WHERE type = 'model' AND created_at >= ${since} AND model_name IS NOT NULL
        GROUP BY bucket, k
        ORDER BY bucket
      `)
      const models = db.select({ name: model.name, label: model.label }).from(model).all()
      for (const m of models) labels[m.name] = m.label || m.name
    } else {
      rows = db.all<AggRow>(sql`
        SELECT strftime(${fmt}, cl.created_at / 1000, 'unixepoch', 'localtime') AS bucket,
               je.value AS k,
               count(*) AS n
        FROM call_log cl, json_each(cl.knowledge_base_ids) je
        WHERE cl.type = 'kb' AND cl.created_at >= ${since} AND cl.knowledge_base_ids IS NOT NULL
        GROUP BY bucket, k
        ORDER BY bucket
      `)
      const kbs = db.select({ id: knowledgeBase.id, name: knowledgeBase.name }).from(knowledgeBase).all()
      for (const k of kbs) labels[k.id] = k.name
    }

    // 组装成 { keys, labels, points[] }
    const keySet = new Set<string>()
    const bucketMap = new Map<string, Record<string, number>>()
    for (const r of rows) {
      if (r.k == null) continue
      keySet.add(r.k)
      const counts = bucketMap.get(r.bucket) ?? {}
      counts[r.k] = Number(r.n)
      bucketMap.set(r.bucket, counts)
    }
    const points: CallSeriesPoint[] = [...bucketMap.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([bucket, counts]) => ({ bucket, counts }))

    // 为未命名的 key 补默认 label
    for (const k of keySet) if (!labels[k]) labels[k] = k

    const series: CallSeries = { keys: [...keySet], labels, points }
    return c.json(series)
  })
  // 每个知识库的满意度
  .get('/satisfaction', requireAdmin, c => {
    interface Row { kb: string; positive: number; negative: number }
    const rows = db.all<Row>(sql`
      SELECT je.value AS kb,
             sum(CASE WHEN f.rating = 1 THEN 1 ELSE 0 END) AS positive,
             sum(CASE WHEN f.rating = -1 THEN 1 ELSE 0 END) AS negative
      FROM feedback f, json_each(f.knowledge_base_ids) je
      GROUP BY kb
    `)
    const kbs = db.select({ id: knowledgeBase.id, name: knowledgeBase.name }).from(knowledgeBase).all()
    const nameMap = new Map(kbs.map(k => [k.id, k.name]))
    const result: KbSatisfaction[] = rows.map(r => {
      const positive = Number(r.positive)
      const negative = Number(r.negative)
      const total = positive + negative
      return {
        knowledgeBaseId: r.kb,
        name: nameMap.get(r.kb) ?? r.kb,
        positive,
        negative,
        rate: total > 0 ? positive / total : null
      }
    })
    return c.json(result)
  })

export default app

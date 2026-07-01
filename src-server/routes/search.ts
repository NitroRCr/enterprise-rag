import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { requireAuth, type AuthEnv } from '../utils/auth-guard'
import { getVisibleKbIds } from '../utils/access'
import { logCall } from '../utils/observability'
import type { SearchResult } from 'app/src-shared/utils/types'

interface Row {
  id: string
  name: string
  knowledgeBaseId: string
  knowledgeBaseName: string
  snippet: string
}

const app = new Hono<AuthEnv>()
  .post('/', requireAuth, zValidator('json', z.object({
    knowledgeBaseIds: z.array(z.string()).default([]),
    query: z.string().min(1),
    limit: z.number().int().min(1).max(50).default(15)
  })), c => {
    const { knowledgeBaseIds, query, limit } = c.req.valid('json')
    const userId = c.get('user').id

    // 部门越权防护：非管理员将请求的知识库范围收敛到其可见集合
    const visible = getVisibleKbIds(c.get('user'))
    let effectiveKbIds = knowledgeBaseIds
    if (visible !== null) {
      const allow = new Set(visible)
      effectiveKbIds = knowledgeBaseIds.length > 0
        ? knowledgeBaseIds.filter(id => allow.has(id))
        : visible
      // 请求了知识库但全部越权 → 返回空结果
      if (knowledgeBaseIds.length > 0 && effectiveKbIds.length === 0) {
        logCall({ type: 'kb', userId, knowledgeBaseIds, query, resultCount: 0, durationMs: 0, success: true })
        return c.json([] as SearchResult[])
      }
    }

    // 将查询词作为 FTS5 短语处理，转义内部双引号，避免语法字符破坏匹配
    const match = `"${query.replace(/"/g, '""')}"`

    const kbFilter = effectiveKbIds.length > 0
      ? sql`AND d.knowledge_base_id IN (${sql.join(effectiveKbIds.map(id => sql`${id}`), sql`, `)})`
      : sql``

    const started = performance.now()
    const rows = db.all<Row>(sql`
      SELECT
        d.id AS id,
        d.name AS name,
        d.knowledge_base_id AS knowledgeBaseId,
        kb.name AS knowledgeBaseName,
        snippet(document_fts, 1, '<mark>', '</mark>', ' … ', 24) AS snippet
      FROM document_fts
      JOIN document d ON d.rowid = document_fts.rowid
      JOIN knowledge_base kb ON kb.id = d.knowledge_base_id
      WHERE document_fts MATCH ${match}
        ${kbFilter}
      ORDER BY bm25(document_fts)
      LIMIT ${limit}
    `)

    logCall({
      type: 'kb',
      userId,
      knowledgeBaseIds: effectiveKbIds,
      query,
      resultCount: rows.length,
      durationMs: performance.now() - started,
      success: true
    })

    const results: SearchResult[] = rows.map(r => ({
      id: r.id,
      name: r.name,
      knowledgeBaseId: r.knowledgeBaseId,
      knowledgeBaseName: r.knowledgeBaseName,
      snippet: r.snippet,
      url: `/doc/${r.id}`
    }))
    return c.json(results)
  })

export default app

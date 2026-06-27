import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { sql } from 'drizzle-orm'
import { db } from '../utils/db'
import { requireAuth, type AuthEnv } from '../utils/auth-guard'
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

    // 将查询词作为 FTS5 短语处理，转义内部双引号，避免语法字符破坏匹配
    const match = `"${query.replace(/"/g, '""')}"`

    const kbFilter = knowledgeBaseIds.length > 0
      ? sql`AND d.knowledge_base_id IN (${sql.join(knowledgeBaseIds.map(id => sql`${id}`), sql`, `)})`
      : sql``

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

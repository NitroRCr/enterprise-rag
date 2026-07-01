import { Hono } from 'hono'
import { z } from 'zod'
import { sql, inArray } from 'drizzle-orm'
import { StreamableHTTPTransport } from '@hono/mcp'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../utils/db'
import { document } from '../schema'
import { auth } from '../auth/auth'
import { getUserKbIds } from '../utils/access'
import { logCall } from '../utils/observability'
import { SERVER_URL } from '../utils/config'

interface SearchRow {
  id: string
  name: string
  knowledgeBaseId: string
  knowledgeBaseName: string
  snippet: string
}

/** 在指定知识库集合内执行 FTS5 全文搜索 */
function searchKb(query: string, kbIds: string[], limit: number): SearchRow[] {
  if (kbIds.length === 0) return []
  const match = `"${query.replace(/"/g, '""')}"`
  const kbFilter = sql`AND d.knowledge_base_id IN (${sql.join(kbIds.map(id => sql`${id}`), sql`, `)})`
  return db.all<SearchRow>(sql`
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
}

/** 为某个已授权用户构建 MCP Server（工具作用域限定其所属部门的知识库） */
function buildServer(userId: string) {
  const server = new McpServer({ name: 'enterprise-rag', version: '1.0.0' })

  server.registerTool('search', {
    title: '知识库全文搜索',
    description: '在你有权访问的企业知识库中进行全文搜索，返回相关文档（名称、高亮片段、文档ID）。',
    inputSchema: { query: z.string().describe('搜索关键词') }
  }, ({ query }) => {
    const kbIds = getUserKbIds(userId)
    const started = performance.now()
    const rows = searchKb(query, kbIds, 15)
    logCall({ type: 'kb', userId, knowledgeBaseIds: kbIds, query, resultCount: rows.length, durationMs: performance.now() - started, success: true })
    const results = rows.map(r => ({ id: r.id, name: r.name, knowledgeBaseId: r.knowledgeBaseId, knowledgeBaseName: r.knowledgeBaseName, snippet: r.snippet }))
    return {
      content: [{
        type: 'text' as const,
        text: results.length ? JSON.stringify(results, null, 2) : '未找到相关文档，可尝试更换关键词。'
      }]
    }
  })

  server.registerTool('get_documents', {
    title: '获取文档全文',
    description: '根据文档 ID 列表获取完整内容，用于详细回答。仅返回你有权访问的文档。',
    inputSchema: { ids: z.array(z.string()).describe('文档 ID 列表') }
  }, async ({ ids }) => {
    const kbIds = new Set(getUserKbIds(userId))
    const rows = await db.select().from(document).where(inArray(document.id, ids))
    const docs = rows
      .filter(r => kbIds.has(r.knowledgeBaseId))
      .map(r => ({ id: r.id, name: r.name, knowledgeBaseId: r.knowledgeBaseId, language: r.language, content: r.content }))
    logCall({ type: 'kb', userId, knowledgeBaseIds: [...new Set(docs.map(d => d.knowledgeBaseId))], resultCount: docs.length, durationMs: 0, success: true })
    return { content: [{ type: 'text' as const, text: JSON.stringify(docs, null, 2) }] }
  })

  return server
}

const app = new Hono()
  .all('/', async c => {
    // 校验 MCP OAuth Bearer access token
    const session = await auth.api.getMcpSession({ headers: c.req.raw.headers })
    if (!session) {
      const wwwAuth = `Bearer resource_metadata="${SERVER_URL}/api/auth/.well-known/oauth-protected-resource"`
      return c.json(
        { jsonrpc: '2.0', error: { code: -32000, message: 'Unauthorized: Authentication required' }, id: null },
        401,
        { 'WWW-Authenticate': wwwAuth, 'Access-Control-Expose-Headers': 'WWW-Authenticate' }
      )
    }
    const server = buildServer(session.userId)
    const transport = new StreamableHTTPTransport()
    await server.connect(transport)
    return transport.handleRequest(c)
  })

export default app

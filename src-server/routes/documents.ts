import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '../utils/db'
import { document, knowledgeBase } from '../schema'
import { genId } from 'app/src-shared/utils/id'
import { requireAdmin, requireAuth, type AuthEnv } from '../utils/auth-guard'
import { getVisibleKbIds } from '../utils/access'
import { logCall } from '../utils/observability'
import { parseFile } from '../utils/file-parser'
import { getExt } from 'app/src-shared/utils/functions'
import { UPLOAD_DIR } from '../utils/config'
import { join } from 'node:path'
import { rm } from 'node:fs/promises'

const listCols = {
  id: document.id,
  knowledgeBaseId: document.knowledgeBaseId,
  name: document.name,
  originalName: document.originalName,
  ext: document.ext,
  mimeType: document.mimeType,
  size: document.size,
  language: document.language,
  createdAt: document.createdAt
}

const app = new Hono<AuthEnv>()
  // 批量上传文档（multipart/form-data）
  .post('/upload', requireAdmin, async c => {
    const form = await c.req.formData()
    const knowledgeBaseId = form.get('knowledgeBaseId')?.toString()
    if (!knowledgeBaseId) return c.json({ error: 'knowledgeBaseId required' }, 400)
    const kb = db.select().from(knowledgeBase).where(eq(knowledgeBase.id, knowledgeBaseId)).get()
    if (!kb) return c.json({ error: 'Knowledge base not found' }, 404)

    const files = form.getAll('files').filter((f): f is File => f instanceof File)
    if (files.length === 0) return c.json({ error: 'No files' }, 400)

    const created: { id: string; name: string }[] = []
    // 顺序解析，避免大文件并发导致内存峰值
    for (const file of files) {
      const buf = await file.arrayBuffer()
      const id = genId()
      const ext = getExt(file.name)
      let parsed = { content: '', language: 'text' }
      try {
        parsed = await parseFile(file.name, file.type, buf)
      } catch (err) {
        console.error('Parse failed for', file.name, err)
      }
      // 保存原始文件
      const filePath = join(id, file.name)
      await Bun.write(join(UPLOAD_DIR, filePath), buf)
      await db.insert(document).values({
        id,
        knowledgeBaseId,
        name: file.name,
        originalName: file.name,
        ext,
        mimeType: file.type || '',
        size: file.size,
        language: parsed.language,
        content: parsed.content,
        filePath,
        createdAt: Date.now()
      })
      created.push({ id, name: file.name })
    }
    return c.json({ created })
  })
  // 文档列表（不含正文）
  .get('/', requireAuth, zValidator('query', z.object({
    knowledgeBaseId: z.string().optional()
  })), async c => {
    const { knowledgeBaseId } = c.req.valid('query')
    const rows = knowledgeBaseId
      ? await db.select(listCols).from(document).where(eq(document.knowledgeBaseId, knowledgeBaseId)).orderBy(desc(document.createdAt))
      : await db.select(listCols).from(document).orderBy(desc(document.createdAt))
    return c.json(rows)
  })
  // 通过 ID 列表批量获取完整文档内容（get_documents 工具使用）
  .post('/batch', requireAuth, zValidator('json', z.object({
    ids: z.array(z.string()).min(1).max(50)
  })), async c => {
    const { ids } = c.req.valid('json')
    const rows = await db.select().from(document).where(inArray(document.id, ids))
    // 部门越权防护：非管理员仅能取其可见知识库下的文档
    const visible = getVisibleKbIds(c.get('user'))
    const filtered = visible === null
      ? rows
      : rows.filter(r => visible.includes(r.knowledgeBaseId))
    // 记录知识库取文档调用
    logCall({
      type: 'kb',
      userId: c.get('user').id,
      knowledgeBaseIds: [...new Set(filtered.map(r => r.knowledgeBaseId))],
      resultCount: filtered.length,
      durationMs: 0,
      success: true
    })
    return c.json(filtered.map(r => ({
      id: r.id,
      name: r.name,
      knowledgeBaseId: r.knowledgeBaseId,
      language: r.language,
      content: r.content
    })))
  })
  // 单个文档完整内容（文档页使用）
  .get('/:id', requireAuth, c => {
    const id = c.req.param('id')
    const row = db.select().from(document).where(eq(document.id, id)).get()
    if (!row) return c.json({ error: 'Not found' }, 404)
    const visible = getVisibleKbIds(c.get('user'))
    if (visible !== null && !visible.includes(row.knowledgeBaseId)) return c.json({ error: 'Forbidden' }, 403)
    const kb = db.select({ name: knowledgeBase.name }).from(knowledgeBase).where(eq(knowledgeBase.id, row.knowledgeBaseId)).get()
    return c.json({ ...row, knowledgeBaseName: kb?.name ?? '' })
  })
  // 下载原始文件
  .get('/:id/download', requireAuth, async c => {
    const id = c.req.param('id')
    const row = db.select().from(document).where(eq(document.id, id)).get()
    if (!row) return c.json({ error: 'Not found' }, 404)
    const visible = getVisibleKbIds(c.get('user'))
    if (visible !== null && !visible.includes(row.knowledgeBaseId)) return c.json({ error: 'Forbidden' }, 403)
    const file = Bun.file(join(UPLOAD_DIR, row.filePath))
    if (!(await file.exists())) return c.json({ error: 'File missing' }, 404)
    return new Response(file, {
      headers: {
        'Content-Type': row.mimeType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(row.originalName)}`
      }
    })
  })
  // 删除文档
  .delete('/:id', requireAdmin, async c => {
    const id = c.req.param('id')
    await db.delete(document).where(eq(document.id, id))
    await rm(join(UPLOAD_DIR, id), { recursive: true, force: true }).catch(() => {})
    return c.json({ ok: true })
  })

export default app

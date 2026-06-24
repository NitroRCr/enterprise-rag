import { tool, type ToolSet } from 'ai'
import { z } from 'zod'
import { api, unwrap } from './hc'
import type { SearchResult } from 'app/src-shared/utils/types'

interface DocFull {
  id: string
  name: string
  knowledgeBaseId: string
  language: string
  content: string
}

/**
 * 为指定知识库构建 RAG 工具集（搜索 + 取全文）。
 */
export function makeTools(knowledgeBaseIds: string[]): ToolSet {
  return {
    search: tool({
      description: '在企业知识库中进行全文搜索，返回相关文档列表（含文档名称、高亮片段、文档ID、链接）。使用精准的关键词以提升召回质量。',
      inputSchema: z.object({
        query: z.string().describe('搜索关键词')
      }),
      async execute({ query }) {
        const res = await api.search.$post({
          json: { knowledgeBaseIds, query, limit: 15 }
        })
        const results = await unwrap<SearchResult[]>(res)
        if (results.length === 0) {
          return { results: [], message: '未找到相关文档，可尝试更换关键词。' }
        }
        return { results }
      }
    }),
    get_documents: tool({
      description: '根据文档 ID 列表获取这些文档的完整内容，用于详细回答用户问题。',
      inputSchema: z.object({
        ids: z.array(z.string()).describe('文档 ID 列表')
      }),
      async execute({ ids }) {
        const res = await api.documents.batch.$post({ json: { ids } })
        const docs = await unwrap<DocFull[]>(res)
        return { documents: docs }
      }
    })
  }
}

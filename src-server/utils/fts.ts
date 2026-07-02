/**
 * 构建 FTS5 MATCH 表达式。
 *
 * 将用户输入按空白拆分为多个关键词，每个词单独作为短语（转义内部双引号），
 * 再用 OR 连接以提升召回：任一关键词命中即可返回，命中更多词的文档由 bm25() 排在前面。
 */
export function buildFtsMatch(query: string): string {
  const terms = query.trim().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return ''
  return terms.map(t => `"${t.replace(/"/g, '""')}"`).join(' OR ')
}

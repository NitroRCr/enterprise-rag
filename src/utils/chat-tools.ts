import type { ModelMessage, UserContent } from 'ai'
import type { Message, MessageContent, StoredItem } from './types'
import { ROOT } from './types'

/**
 * 按分支路由从消息树中解析出当前会话链。
 * 移植自 nyaai：route 为 Record<string, number>，每个节点记忆自己选中的子分支，
 * 因此切换上层分支后，下层分支的选择仍被保留（分支记忆）。
 */
export function getChain(
  tree: Record<string, string[]>,
  node: string,
  route: Record<string, number>
): string[] {
  const children = tree[node] ?? []
  const r = route[node] ?? 0
  return children[r] ? [node, ...getChain(tree, children[r], route)] : [node]
}

/** 展开某节点下的整棵子树（含自身），用于删除分支时收集待删消息 */
export function expandMessageTree(tree: Record<string, string[]>, root: string): string[] {
  return [root, ...(tree[root] ?? []).flatMap(id => expandMessageTree(tree, id))]
}

/** 反向索引：子节点 id -> 父节点 id */
export function buildParentMap(tree: Record<string, string[]>): Record<string, string> {
  const map: Record<string, string> = {}
  for (const [parent, children] of Object.entries(tree)) {
    for (const child of children) map[child] = parent
  }
  return map
}

/**
 * 将会话链上的消息转换为可发送给模型的 ModelMessage[]。
 * 历史消息仅携带文本（保持轻量与上下文有效性）；用户消息额外附带图片/文件内容。
 */
export function buildModelMessages(
  chainIds: string[],
  messageMap: Record<string, Message>,
  itemMap: Record<string, StoredItem>,
  modelSupportsImage = true
): ModelMessage[] {
  const result: ModelMessage[] = []
  for (const id of chainIds) {
    if (id === ROOT) continue
    const msg = messageMap[id]
    if (!msg || msg.status === 'inputing') continue

    if (msg.type === 'user') {
      const content: UserContent = []
      for (const c of msg.contents) {
        if (c.type !== 'user-message') continue
        if (c.text.trim()) content.push({ type: 'text', text: c.text })
        for (const itemId of c.items) {
          const item = itemMap[itemId]
          if (!item) continue
          if (item.contentText != null) {
            const wrapped = item.type === 'text'
              ? `<file name="${item.name ?? 'file'}">\n${item.contentText}\n</file>`
              : item.contentText
            content.push({ type: 'text', text: wrapped })
          } else if (item.contentBuffer && item.mimeType?.startsWith('image/') && modelSupportsImage) {
            content.push({ type: 'image', image: new Uint8Array(item.contentBuffer), mediaType: item.mimeType })
          }
        }
      }
      if (content.length === 0) content.push({ type: 'text', text: '' })
      result.push({ role: 'user', content })
    } else {
      // 助手消息：合并所有文本块
      const text = msg.contents
        .filter((c): c is Extract<MessageContent, { type: 'assistant-message' }> => c.type === 'assistant-message')
        .map(c => c.text)
        .join('\n')
        .trim()
      if (text) result.push({ role: 'assistant', content: text })
    }
  }
  return result
}

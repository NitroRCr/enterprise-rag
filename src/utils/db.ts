import Dexie, { type Table } from 'dexie'
import type { Dialog, Message, StoredItem } from './types'

class AppDexie extends Dexie {
  dialogs!: Table<Dialog, string>
  messages!: Table<Message, string>
  items!: Table<StoredItem, string>

  constructor() {
    super('enterprise-rag')
    // v1：早期线性对话结构（content 字符串）
    this.version(1).stores({
      dialogs: 'id, updatedAt',
      messages: 'id, dialogId, createdAt'
    })
    // v2：消息树 + 内容块 + 附件条目；丢弃旧的线性消息（结构不兼容）
    this.version(2).stores({
      dialogs: 'id, updatedAt',
      messages: 'id, dialogId, createdAt',
      items: 'id, dialogId'
    }).upgrade(async tx => {
      // 旧消息为线性 content 结构，与新树结构不兼容，直接清空
      await tx.table('messages').clear()
      await tx.table('dialogs').clear()
    })
  }
}

export const db = new AppDexie()

import Dexie, { type Table } from 'dexie'
import type { Dialog, Message } from './types'

class AppDexie extends Dexie {
  dialogs!: Table<Dialog, string>
  messages!: Table<Message, string>

  constructor() {
    super('enterprise-rag')
    this.version(1).stores({
      dialogs: 'id, updatedAt',
      messages: 'id, dialogId, createdAt'
    })
  }
}

export const db = new AppDexie()

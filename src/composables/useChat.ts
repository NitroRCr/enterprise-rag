import { ref } from 'vue'
import type { ModelMessage } from 'ai'
import { db } from 'src/utils/db'
import type { Dialog, Message } from 'src/utils/types'
import { genId } from 'app/src-shared/utils/id'
import { streamAssistant } from './useStream'

// 模块级单例状态，供侧边栏与对话页共享
const dialogs = ref<Dialog[]>([])
const currentDialogId = ref<string | null>(null)
const messages = ref<Message[]>([])
const streaming = ref(false)
let abortController: AbortController | null = null

async function refreshDialogs() {
  dialogs.value = await db.dialogs.orderBy('updatedAt').reverse().toArray()
}

async function loadMessages(dialogId: string) {
  messages.value = await db.messages.where('dialogId').equals(dialogId).sortBy('createdAt')
}

async function selectDialog(id: string | null) {
  currentDialogId.value = id
  if (id) await loadMessages(id)
  else messages.value = []
}

async function createDialog(knowledgeBaseIds: string[], modelName: string | null) {
  const now = Date.now()
  const dialog: Dialog = {
    id: genId(),
    title: '新对话',
    knowledgeBaseIds,
    modelName,
    createdAt: now,
    updatedAt: now
  }
  await db.dialogs.put(dialog)
  await refreshDialogs()
  await selectDialog(dialog.id)
  return dialog
}

async function deleteDialog(id: string) {
  await db.messages.where('dialogId').equals(id).delete()
  await db.dialogs.delete(id)
  if (currentDialogId.value === id) await selectDialog(null)
  await refreshDialogs()
}

async function updateDialog(id: string, patch: Partial<Dialog>) {
  await db.dialogs.update(id, { ...patch, updatedAt: Date.now() })
  await refreshDialogs()
}

function currentDialog() {
  return dialogs.value.find(d => d.id === currentDialogId.value) || null
}

function buildModelMessages(): ModelMessage[] {
  return messages.value
    .filter(m => m.content.trim() || m.role === 'user')
    .map(m => ({ role: m.role, content: m.content }) as ModelMessage)
}

let persistTimer: ReturnType<typeof setTimeout> | null = null
function schedulePersist(msg: Message) {
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    db.messages.put({ ...msg })
  }, 300)
}

async function send(text: string) {
  const dialog = currentDialog()
  if (!dialog || !dialog.modelName || streaming.value) return

  const now = Date.now()
  const userMsg: Message = {
    id: genId(), dialogId: dialog.id, role: 'user', content: text, createdAt: now
  }
  messages.value = [...messages.value, userMsg]
  await db.messages.put(userMsg)

  // 首条消息作为标题
  if (dialog.title === '新对话') {
    await updateDialog(dialog.id, { title: text.slice(0, 24) })
  } else {
    await updateDialog(dialog.id, {})
  }

  const assistant: Message = {
    id: genId(), dialogId: dialog.id, role: 'assistant', content: '', createdAt: Date.now()
  }
  messages.value = [...messages.value, assistant]
  // 取数组内的响应式引用
  const assistantRef = messages.value[messages.value.length - 1]

  streaming.value = true
  abortController = new AbortController()
  try {
    await streamAssistant({
      modelName: dialog.modelName,
      knowledgeBaseIds: dialog.knowledgeBaseIds,
      messages: buildModelMessages().slice(0, -1).concat({ role: 'user', content: text }),
      assistant: assistantRef,
      onUpdate: () => {
        messages.value = [...messages.value]
        schedulePersist(assistantRef)
      },
      abortSignal: abortController.signal
    })
  } catch (err) {
    assistantRef.error = (err as Error).message
  } finally {
    streaming.value = false
    abortController = null
    if (persistTimer) { clearTimeout(persistTimer); persistTimer = null }
    await db.messages.put({ ...assistantRef })
  }
}

function stop() {
  abortController?.abort()
}

export function useChat() {
  return {
    dialogs,
    currentDialogId,
    messages,
    streaming,
    refreshDialogs,
    selectDialog,
    createDialog,
    deleteDialog,
    updateDialog,
    currentDialog,
    send,
    stop
  }
}

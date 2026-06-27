import { computed, ref, toRaw, watch } from 'vue'
import { liveQuery, type Subscription } from 'dexie'
import { throttle } from 'quasar'
import { streamText, stepCountIs } from 'ai'
import { db } from 'src/utils/db'
import { getModel } from 'src/utils/model'
import { makeTools } from 'src/utils/ai-tools'
import { SYSTEM_PROMPT } from 'src/utils/system-prompt'
import { genId } from 'app/src-shared/utils/id'
import { ROOT } from 'src/utils/types'
import type { AssistantMessageContent, AssistantToolContent, Dialog, Message, StoredItem, UserMessageContent } from 'src/utils/types'
import { buildModelMessages, expandMessageTree, getChain } from 'src/utils/chat-tools'

// ----- 模块级单例响应式状态（侧边栏与对话页共享） -----
const dialogs = ref<Dialog[]>([])
const currentDialogId = ref<string | null>(null)
const dialog = ref<Dialog | null>(null)
const messages = ref<Message[]>([])
const items = ref<StoredItem[]>([])
/** 正在生成的助手消息 id（用于停止/进度展示） */
const generatingId = ref<string | null>(null)
/** 对话列表首次加载完成标志 */
const loaded = ref(false)
const abortMap = new Map<string, AbortController>()

// ----- 派生状态 -----
const messageMap = computed<Record<string, Message>>(() => {
  const map: Record<string, Message> = {}
  for (const m of messages.value) map[m.id] = m
  return map
})
const itemMap = computed<Record<string, StoredItem>>(() => {
  const map: Record<string, StoredItem> = {}
  for (const i of items.value) map[i.id] = i
  return map
})
const chain = computed<string[]>(() =>
  dialog.value ? getChain(dialog.value.msgTree, ROOT, dialog.value.msgRoute) : []
)
/** 输入框对应的「输入中」用户消息（始终为会话链尾节点） */
const inputMessage = computed<Message | null>(() => {
  const id = chain.value.at(-1)
  return id ? messageMap.value[id] ?? null : null
})
const inputContent = computed<UserMessageContent | null>(() => {
  const c = inputMessage.value?.contents[0]
  return c && c.type === 'user-message' ? c : null
})
const inputItems = computed<StoredItem[]>(() =>
  (inputContent.value?.items ?? []).map(id => itemMap.value[id]).filter(Boolean)
)
const generating = computed(() => {
  const id = chain.value.at(-2)
  const status = id ? messageMap.value[id]?.status : undefined
  return status === 'pending' || status === 'streaming'
})
const inputEmpty = computed(() => !inputContent.value?.text?.trim() && !inputContent.value?.items.length)

// ----- liveQuery 订阅 -----
let started = false
let dialogSub: Subscription | undefined
function ensureStarted() {
  if (started) return
  started = true
  liveQuery(() => db.dialogs.orderBy('updatedAt').reverse().toArray()).subscribe({
    next: v => { dialogs.value = v; loaded.value = true }
  })
  watch(currentDialogId, id => {
    dialogSub?.unsubscribe()
    dialogSub = undefined
    if (!id) {
      dialog.value = null
      messages.value = []
      items.value = []
      return
    }
    dialogSub = liveQuery(async () => {
      const [d, ms, its] = await Promise.all([
        db.dialogs.get(id),
        db.messages.where('dialogId').equals(id).toArray(),
        db.items.where('dialogId').equals(id).toArray()
      ])
      return { d, ms, its }
    }).subscribe({
      next: ({ d, ms, its }) => {
        dialog.value = d ?? null
        messages.value = ms
        items.value = its
      }
    })
  }, { immediate: true })
}

// ----- 对话管理 -----
async function refreshDialogs() {
  ensureStarted()
  dialogs.value = await db.dialogs.orderBy('updatedAt').reverse().toArray()
}

function selectDialog(id: string | null) {
  ensureStarted()
  currentDialogId.value = id
}

async function createDialog(knowledgeBaseIds: string[], modelName: string | null) {
  ensureStarted()
  const now = Date.now()
  const id = genId()
  const rootChildId = genId()
  const d: Dialog = {
    id,
    title: '新对话',
    knowledgeBaseIds,
    modelName,
    msgTree: { [ROOT]: [rootChildId], [rootChildId]: [] },
    msgRoute: {},
    createdAt: now,
    updatedAt: now
  }
  await db.transaction('rw', db.dialogs, db.messages, async () => {
    await db.dialogs.add(d)
    await db.messages.add({
      id: rootChildId,
      dialogId: id,
      type: 'user',
      contents: [{ type: 'user-message', text: '', items: [] }],
      status: 'inputing',
      createdAt: now
    })
  })
  selectDialog(id)
  return d
}

async function deleteDialog(id: string) {
  await db.transaction('rw', db.dialogs, db.messages, db.items, async () => {
    await db.messages.where('dialogId').equals(id).delete()
    await db.items.where('dialogId').equals(id).delete()
    await db.dialogs.delete(id)
  })
  if (currentDialogId.value === id) selectDialog(null)
}

async function updateDialog(id: string, patch: Partial<Dialog>) {
  await db.dialogs.update(id, { ...patch, updatedAt: Date.now() })
}

function currentDialog() {
  return dialog.value
}

// ----- 树/分支操作 -----
function switchChain(parent: string, value: number) {
  const d = dialog.value
  if (!d) return
  db.dialogs.update(d.id, { msgRoute: { ...d.msgRoute, [parent]: value } })
}

/** 在 target 节点下追加一条消息；insert=true 时插入为中间节点 */
async function appendMessage(target: string, info: Partial<Message>, insert = false) {
  const dialogId = currentDialogId.value!
  const id = genId()
  await db.transaction('rw', db.dialogs, db.messages, async () => {
    await db.messages.add({
      id,
      dialogId,
      createdAt: Date.now(),
      ...info
    } as Message)
    const d = await db.dialogs.get(dialogId)
    if (!d) return
    const children = d.msgTree[target] ?? []
    const changes = insert
      ? { [target]: [id], [id]: children }
      : { [target]: [...children, id], [id]: [] }
    await db.dialogs.update(dialogId, {
      msgTree: { ...d.msgTree, ...changes },
      updatedAt: Date.now()
    })
  })
  return id
}

async function saveItems(its: StoredItem[]) {
  its.forEach(i => { i.references++ })
  await db.items.bulkPut(its.map(i => ({ ...i })))
}

// ----- 输入区 -----
async function updateInputText(text: string) {
  const id = chain.value.at(-1)
  const content = inputContent.value
  if (!id || !content) return
  await db.messages.update(id, { contents: [{ ...toRaw(content), text }] })
}

async function addInputItems(newItems: Omit<StoredItem, 'id' | 'dialogId' | 'references'>[]) {
  const id = chain.value.at(-1)
  const content = inputContent.value
  if (!id || !content || !currentDialogId.value) return
  const stored: StoredItem[] = newItems.map(i => ({
    ...i,
    id: genId(),
    dialogId: currentDialogId.value!,
    references: 0
  }))
  await db.transaction('rw', db.messages, db.items, async () => {
    await db.messages.update(id, {
      contents: [{ ...content, items: [...content.items, ...stored.map(i => i.id)] }]
    })
    await saveItems(stored)
  })
}

async function removeInputItem(itemId: string) {
  const id = chain.value.at(-1)
  const content = inputContent.value
  const item = itemMap.value[itemId]
  if (!id || !content || !item) return
  await db.transaction('rw', db.messages, db.items, async () => {
    await db.messages.update(id, {
      contents: [{ ...content, items: content.items.filter(i => i !== itemId) }]
    })
    const references = item.references - 1
    if (references <= 0) await db.items.delete(itemId)
    else await db.items.update(itemId, { references })
  })
}

const TEXT_EXT = /\.(txt|md|markdown|json|ya?ml|csv|tsv|log|js|ts|jsx|tsx|vue|py|java|c|cpp|h|go|rs|rb|php|sh|sql|html?|css|scss|xml|toml|ini)$/i
function isTextFile(file: File) {
  if (file.type.startsWith('text/')) return true
  if (TEXT_EXT.test(file.name)) return true
  return false
}

/** 处理用户选择/粘贴的文件：图片与文件入库为附件，文本文件内联为文本 */
async function addFiles(files: File[]) {
  const newItems: Omit<StoredItem, 'id' | 'dialogId' | 'references'>[] = []
  for (const file of files) {
    if (file.type.startsWith('image/')) {
      newItems.push({ type: 'image', name: file.name, mimeType: file.type, contentBuffer: await file.arrayBuffer() })
    } else if (isTextFile(file)) {
      newItems.push({ type: 'text', name: file.name, contentText: await file.text() })
    } else {
      newItems.push({ type: 'file', name: file.name, mimeType: file.type, contentBuffer: await file.arrayBuffer() })
    }
  }
  if (newItems.length) await addInputItems(newItems)
}

// ----- 发送 / 生成 -----
async function send() {
  const d = dialog.value
  const target = chain.value.at(-1)
  if (!d || !d.modelName || !target || inputEmpty.value || generating.value) return

  // 首条消息作为标题
  const text = inputContent.value?.text?.trim() ?? ''
  if (d.title === '新对话' && text) {
    await updateDialog(d.id, { title: text.slice(0, 30) })
  }

  await db.messages.update(target, { status: 'default' })
  const historyChain = [...chain.value]
  // target 已有一个「输入中」尾节点会被复用为后续输入框，这里在其下追加助手回合
  const { assistantId, contents, assistantContent } = await appendAssistantTurn(target)
  await runStream(assistantId, contents, assistantContent, historyChain)
}

async function regenerate(parent: string) {
  const d = dialog.value
  if (!d || !d.modelName || generating.value) return
  const idx = chain.value.indexOf(parent)
  if (idx === -1) return
  const historyChain = chain.value.slice(0, idx + 1)
  const newIndex = (d.msgTree[parent] ?? []).length
  // 先在 parent 下追加新分支（助手 + 输入中用户），再切换路由，避免切换瞬间输入框闪烁旧内容
  const { assistantId, contents, assistantContent } = await appendAssistantTurn(parent)
  switchChain(parent, newIndex)
  await runStream(assistantId, contents, assistantContent, historyChain)
}

async function edit(parent: string) {
  const d = dialog.value
  if (!d) return
  const currentId = d.msgTree[parent]?.[d.msgRoute[parent] ?? 0]
  const cur = currentId ? messageMap.value[currentId] : null
  if (!cur) return
  const content = cur.contents[0]
  const userContent: UserMessageContent = content?.type === 'user-message'
    ? { type: 'user-message', text: content.text, items: [...content.items] }
    : { type: 'user-message', text: '', items: [] }
  const newIndex = (d.msgTree[parent] ?? []).length
  await db.transaction('rw', db.dialogs, db.messages, db.items, async () => {
    await appendMessage(parent, {
      type: 'user',
      contents: [userContent],
      status: 'inputing'
    })
    // 复制的附件引用计数 +1
    const its = userContent.items.map(id => itemMap.value[id]).filter(Boolean)
    its.forEach(i => db.items.update(i.id, { references: i.references + 1 }))
  })
  switchChain(parent, newIndex)
}

async function deleteBranch(parent: string) {
  const d = dialog.value
  if (!d) return
  const branch = d.msgRoute[parent] ?? 0
  const anchor = d.msgTree[parent]?.[branch]
  if (!anchor) return
  const ids = expandMessageTree(d.msgTree, anchor)
  // 收集待释放的附件条目
  const itemIds = ids
    .flatMap(id => messageMap.value[id]?.contents ?? [])
    .flatMap(c => (c.type === 'user-message' ? c.items : []))

  await db.transaction('rw', db.dialogs, db.messages, db.items, async () => {
    await db.messages.bulkDelete(ids)
    for (const itemId of itemIds) {
      const item = itemMap.value[itemId]
      if (!item) continue
      const references = item.references - 1
      if (references <= 0) await db.items.delete(itemId)
      else await db.items.update(itemId, { references })
    }
    const cur = await db.dialogs.get(d.id)
    if (!cur) return
    const msgTree = { ...cur.msgTree }
    msgTree[parent] = (msgTree[parent] ?? []).filter(id => id !== anchor)
    ids.forEach(id => { delete msgTree[id] })
    const msgRoute = { ...cur.msgRoute }
    ids.forEach(id => { delete msgRoute[id] })
    // 若删除的是末尾分支，路由回退一格
    if (branch >= msgTree[parent].length) msgRoute[parent] = Math.max(0, msgTree[parent].length - 1)
    await db.dialogs.update(d.id, { msgTree, msgRoute, updatedAt: Date.now() })
  })
}

/** 在 target 下追加一个助手回合（助手消息 + 新的输入中用户消息作为下一轮输入框） */
async function appendAssistantTurn(target: string) {
  const d = dialog.value!
  const assistantContent: AssistantMessageContent = { type: 'assistant-message', text: '' }
  const contents: (AssistantMessageContent | AssistantToolContent)[] = [assistantContent]
  const assistantId = await appendMessage(target, {
    type: 'assistant',
    contents,
    status: 'pending',
    modelName: d.modelName ?? undefined
  })
  await appendMessage(assistantId, {
    type: 'user',
    contents: [{ type: 'user-message', text: '', items: [] }],
    status: 'inputing'
  })
  return { assistantId, contents, assistantContent }
}

async function runStream(
  assistantId: string,
  contents: (AssistantMessageContent | AssistantToolContent)[],
  assistantContent: AssistantMessageContent,
  historyChain: string[]
) {
  const d = dialog.value!
  const modelMessages = buildModelMessages(historyChain, messageMap.value, itemMap.value)
  const persist = throttle(() => { db.messages.update(assistantId, { contents: [...contents] }) }, 80)

  const abort = new AbortController()
  abortMap.set(assistantId, abort)
  generatingId.value = assistantId
  await db.messages.update(assistantId, { status: 'streaming' })

  const toolBlocks = new Map<string, AssistantToolContent>()
  try {
    const result = streamText({
      model: getModel(d.modelName!),
      system: SYSTEM_PROMPT,
      messages: modelMessages,
      tools: makeTools(d.knowledgeBaseIds),
      stopWhen: stepCountIs(8),
      abortSignal: abort.signal
    })
    for await (const part of result.fullStream) {
      switch (part.type) {
        case 'text-delta':
          assistantContent.text += part.text
          persist()
          break
        case 'reasoning-delta':
          assistantContent.reasoning = (assistantContent.reasoning ?? '') + part.text
          persist()
          break
        case 'tool-call': {
          const rec: AssistantToolContent = {
            type: 'assistant-tool',
            toolCallId: part.toolCallId,
            name: part.toolName,
            args: (part.input ?? {}) as Record<string, unknown>,
            status: 'calling'
          }
          toolBlocks.set(part.toolCallId, rec)
          contents.push(rec)
          persist()
          break
        }
        case 'tool-result': {
          const rec = toolBlocks.get(part.toolCallId)
          if (rec) { rec.status = 'completed'; rec.result = part.output }
          persist()
          break
        }
        case 'tool-error': {
          const rec = toolBlocks.get(part.toolCallId)
          if (rec) { rec.status = 'failed'; rec.error = String(part.error) }
          persist()
          break
        }
        case 'error':
          throw (part.error as Error)
      }
    }
    await db.messages.update(assistantId, { contents: [...contents], status: 'default' })
  } catch (e) {
    const aborted = abort.signal.aborted
    await db.messages.update(assistantId, {
      contents: [...contents],
      status: 'failed',
      error: aborted ? '已停止生成' : ((e as Error)?.message || String(e))
    })
  } finally {
    abortMap.delete(assistantId)
    if (generatingId.value === assistantId) generatingId.value = null
  }
}

function stop() {
  const id = chain.value.at(-2)
  if (id) abortMap.get(id)?.abort()
}

export function useChat() {
  ensureStarted()
  return {
    dialogs,
    currentDialogId,
    dialog,
    messages,
    chain,
    messageMap,
    itemMap,
    inputMessage,
    inputContent,
    inputItems,
    inputEmpty,
    generating,
    loaded,
    refreshDialogs,
    selectDialog,
    createDialog,
    deleteDialog,
    updateDialog,
    currentDialog,
    switchChain,
    updateInputText,
    addInputItems,
    addFiles,
    removeInputItem,
    send,
    regenerate,
    edit,
    deleteBranch,
    stop
  }
}

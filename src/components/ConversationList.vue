<template>
  <div class="flex flex-col h-full">
    <div class="p-3">
      <q-btn
        unelevated color="pri" text-color="on-pri" no-caps class="w-full rounded-lg h-10"
        icon="sym_o_add" label="新建对话" @click="newChat"
      />
    </div>
    <q-scroll-area class="flex-1">
      <div class="px-2 pb-4 flex flex-col gap-1">
        <div
          v-for="d in dialogs" :key="d.id"
          class="group px-3 py-2 rounded-lg cursor-pointer flex items-center gap-2 transition-colors"
          :class="d.id === currentDialogId ? 'bg-sec-c text-on-sec-c' : 'hover:bg-sur-c'"
          @click="open(d.id)"
        >
          <q-icon name="sym_o_chat_bubble" size="18px" class="shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{{ d.title }}</div>
            <div class="text-xs op-60">{{ formatTime(d.updatedAt) }}</div>
          </div>
          <q-btn
            flat dense round size="sm" icon="sym_o_delete"
            class="op-0 group-hover:op-100 transition-opacity shrink-0"
            @click.stop="remove(d.id)"
          />
        </div>
        <div v-if="dialogs.length === 0" class="text-center text-xs text-on-sur-var py-8">
          暂无对话，点击上方新建
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Dialog as QDialog } from 'quasar'
import { useChat } from 'src/composables/useChat'
import { useSettingsStore } from 'src/stores/settings'

const router = useRouter()
const settings = useSettingsStore()
const { dialogs, currentDialogId, createDialog, deleteDialog, selectDialog } = useChat()

function defaultKbIds() {
  if (settings.defaultKnowledgeBaseId) return [settings.defaultKnowledgeBaseId]
  return settings.knowledgeBases.map(k => k.id)
}
function defaultModel() {
  return settings.defaultModelName ?? settings.models[0]?.name ?? null
}

async function newChat() {
  await createDialog(defaultKbIds(), defaultModel())
  router.push('/')
}
async function open(id: string) {
  await selectDialog(id)
  router.push('/')
}
function remove(id: string) {
  QDialog.create({
    title: '删除对话',
    message: '确定删除该对话及其消息？',
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(() => deleteDialog(id))
}

function formatTime(ms: number) {
  const d = new Date(ms)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
</script>

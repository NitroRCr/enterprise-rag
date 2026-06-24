<template>
  <q-page class="flex flex-col" style="height: calc(100vh - 56px)">
    <!-- 配置栏：知识库 + 模型 -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-out-var bg-sur flex-wrap">
      <KnowledgeBaseSelect v-model="kbIds" />
      <ModelSelect v-model="modelName" />
      <q-space />
      <span v-if="!modelName" class="text-xs text-warn flex items-center gap-1">
        <q-icon name="sym_o_warning" size="16px" /> 请先在管理端配置模型
      </span>
    </div>

    <!-- 消息区 / 欢迎页 -->
    <div class="flex-1 min-h-0 relative">
      <div v-if="messages.length === 0" class="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div class="w-16 h-16 rounded-3xl bg-pri text-on-pri flex items-center justify-center mb-4">
          <q-icon name="sym_o_menu_book" size="36px" />
        </div>
        <div class="text-2xl font-600 mb-2">{{ settings.siteName }}</div>
        <div class="text-on-sur-var max-w-md">
          基于企业知识库的智能问答。提问后，我会自动检索相关文档并给出带来源引用的回答。
        </div>
      </div>
      <MessageList v-else :messages="messages" :streaming="streaming" />
    </div>

    <!-- 输入区 -->
    <div class="px-4 py-3 max-w-3xl w-full mx-auto">
      <MessageInput :streaming="streaming" :disabled="!modelName" @send="onSend" @stop="stop" />
      <div v-if="kbNames" class="text-xs text-on-sur-var mt-1.5 px-2 truncate">
        检索范围：{{ kbNames }}
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useChat } from 'src/composables/useChat'
import { useSettingsStore } from 'src/stores/settings'
import KnowledgeBaseSelect from 'components/KnowledgeBaseSelect.vue'
import ModelSelect from 'components/ModelSelect.vue'
import MessageList from 'components/MessageList.vue'
import MessageInput from 'components/MessageInput.vue'

const settings = useSettingsStore()
const { messages, streaming, currentDialog, createDialog, updateDialog, send, stop } = useChat()

function defaultKbIds() {
  if (settings.defaultKnowledgeBaseId) return [settings.defaultKnowledgeBaseId]
  return settings.knowledgeBases.map(k => k.id)
}
function defaultModel() {
  return settings.defaultModelName ?? settings.models[0]?.name ?? null
}

const kbIds = computed<string[]>({
  get: () => currentDialog()?.knowledgeBaseIds ?? defaultKbIds(),
  set: v => { const d = currentDialog(); if (d) updateDialog(d.id, { knowledgeBaseIds: v }) }
})
const modelName = computed<string | null>({
  get: () => currentDialog()?.modelName ?? defaultModel(),
  set: v => { const d = currentDialog(); if (d) updateDialog(d.id, { modelName: v }) }
})

const kbNames = computed(() => {
  const ids = kbIds.value
  return settings.knowledgeBases.filter(k => ids.includes(k.id)).map(k => k.name).join('、')
})

async function onSend(text: string) {
  if (!currentDialog()) {
    await createDialog(kbIds.value, modelName.value)
  }
  await send(text)
}
</script>

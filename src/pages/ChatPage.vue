<template>
  <q-page
    class="flex flex-col"
    style="height: calc(100vh - 56px)"
  >
    <!-- 配置栏：知识库 + 模型 -->
    <div class="flex items-center gap-2 px-4 py-2 border-b border-out-var bg-sur flex-wrap">
      <KnowledgeBaseSelect v-model="kbIds" />
      <ModelSelect v-model="modelName" />
      <q-space />
      <span
        v-if="!modelName"
        class="text-xs text-warn flex items-center gap-1"
      >
        <q-icon
          name="sym_o_warning"
          size="16px"
        /> 请先在管理端配置模型
      </span>
    </div>

    <!-- 消息区 -->
    <div
      ref="scrollContainer"
      class="flex-1 min-h-0 of-y-auto relative bg-sur"
      @scroll="onScrollManual"
    >
      <!-- 欢迎页 -->
      <div
        v-if="!hasMessages"
        class="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none"
      >
        <div class="w-16 h-16 rounded-3xl bg-pri text-on-pri flex items-center justify-center mb-4">
          <q-icon
            name="sym_o_menu_book"
            size="36px"
          />
        </div>
        <div class="text-2xl font-600 mb-2">
          {{ settings.siteName }}
        </div>
        <div class="text-on-sur-var max-w-md">
          基于企业知识库的智能问答。提问后，我会自动检索相关文档并给出带来源引用的回答。
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-4 flex flex-col gap-2">
        <template
          v-for="[parent, current] in renderPairs"
          :key="current"
        >
          <MessageItem
            v-if="messageMap[current]"
            :model-value="(dialog!.msgRoute[parent] ?? 0) + 1"
            :message="messageMap[current]"
            :child-num="dialog!.msgTree[parent]?.length ?? 1"
            :item-map="itemMap"
            :scroll-container="scrollContainer"
            :dense="dense"
            :inputing="current === chain.at(-1)"
            @update:model-value="switchChain(parent, $event - 1)"
            @regenerate="onRegenerate(parent)"
            @edit="edit(parent)"
            @delete-branch="deleteBranch(parent)"
            @rendered="onRendered"
          />
        </template>
      </div>
    </div>

    <!-- 输入区 -->
    <div class="px-4 py-3 max-w-4xl w-full mx-auto relative">
      <!-- 滚动按钮 -->
      <div class="absolute right-4 top--1 -translate-y-full flex flex-col text-sec z-1">
        <q-btn
          flat
          round
          dense
          icon="sym_o_first_page"
          class="rotate-90"
          @click="scroll('top')"
        />
        <q-btn
          flat
          round
          dense
          icon="sym_o_keyboard_arrow_up"
          @click="scroll('up')"
        />
        <q-btn
          flat
          round
          dense
          icon="sym_o_keyboard_arrow_down"
          @click="scroll('down')"
        />
        <q-btn
          flat
          round
          dense
          icon="sym_o_last_page"
          class="rotate-90"
          @click="scroll('bottom')"
        />
      </div>

      <MessageInput :disabled="!modelName" />
      <div
        v-if="kbNames"
        class="text-xs text-on-sur-var mt-1.5 px-2 truncate"
      >
        检索范围：{{ kbNames }}
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useQuasar } from 'quasar'
import { useChat } from 'src/composables/useChat'
import { useChatScroll } from 'src/composables/useChatScroll'
import { useSettingsStore } from 'src/stores/settings'
import KnowledgeBaseSelect from 'components/KnowledgeBaseSelect.vue'
import ModelSelect from 'components/ModelSelect.vue'
import MessageItem from 'components/MessageItem.vue'
import MessageInput from 'components/MessageInput.vue'

const $q = useQuasar()
const settings = useSettingsStore()
const {
  dialog, dialogs, currentDialogId, chain, messageMap, itemMap, generating, loaded,
  createDialog, selectDialog, updateDialog, switchChain, regenerate, edit, deleteBranch
} = useChat()

const scrollContainer = ref<HTMLElement | null>(null)
const { scroll } = useChatScroll(scrollContainer)
const dense = computed(() => $q.screen.lt.md)

// 渲染链：跳过根节点，得到 [parent, current] 对
const renderPairs = computed<[string, string][]>(() => {
  const c = chain.value
  const res: [string, string][] = []
  for (let i = 1; i < c.length; i++) res.push([c[i - 1], c[i]])
  return res
})
const hasMessages = computed(() => chain.value.length > 2)

function defaultKbIds() {
  if (settings.defaultKnowledgeBaseId) return [settings.defaultKnowledgeBaseId]
  return settings.knowledgeBases.map(k => k.id)
}
function defaultModel() {
  return settings.defaultModelName ?? settings.models[0]?.name ?? null
}

// 初始化：首次进入选中最近对话或新建；删除最后一个对话后自动新建，避免无对话死局
let firstLoad = true
watch([loaded, currentDialogId], () => {
  if (!loaded.value) return
  if (currentDialogId.value) { firstLoad = false; return }
  if (firstLoad && dialogs.value.length) {
    firstLoad = false
    selectDialog(dialogs.value[0].id)
  } else {
    firstLoad = false
    createDialog(defaultKbIds(), defaultModel())
  }
}, { immediate: true })

const kbIds = computed<string[]>({
  get: () => dialog.value?.knowledgeBaseIds ?? defaultKbIds(),
  set: v => { if (dialog.value) updateDialog(dialog.value.id, { knowledgeBaseIds: v }) }
})
const modelName = computed<string | null>({
  get: () => dialog.value?.modelName ?? defaultModel(),
  set: v => { if (dialog.value) updateDialog(dialog.value.id, { modelName: v }) }
})
const kbNames = computed(() => {
  const ids = kbIds.value
  return settings.knowledgeBases.filter(k => ids.includes(k.id)).map(k => k.name).join('、')
})

function onRegenerate(parent: string) {
  lockingBottom.value = true
  regenerate(parent)
}

// 流式锁定底部
const lockingBottom = ref(false)
let lastScrollTop: number | null = null
function onScrollManual() {
  if (!lockingBottom.value || lastScrollTop === null) return
  const top = scrollContainer.value?.scrollTop ?? 0
  if (top < lastScrollTop) lockingBottom.value = false
  lastScrollTop = top
}
function onRendered() {
  if (lockingBottom.value) {
    scroll('bottom', 'auto')
    lastScrollTop = scrollContainer.value?.scrollTop ?? 0
  }
}
watch(generating, val => {
  if (val) {
    lockingBottom.value = true
    lastScrollTop = scrollContainer.value?.scrollTop ?? 0
    nextTick(() => scroll('bottom', 'auto'))
  } else {
    lockingBottom.value = false
  }
})

// 切换对话时滚动到底
watch(currentDialogId, () => {
  nextTick(() => scroll('bottom', 'auto'))
})
</script>

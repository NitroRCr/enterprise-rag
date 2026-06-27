<template>
  <!-- 输入中的尾节点：仅在存在多个草稿分支时显示分支切换条 -->
  <div
    v-if="inputing"
    class="message-item"
  >
    <div
      v-if="childNum > 1"
      class="flex items-center gap-1 text-sec justify-end pr-1"
    >
      <q-pagination
        v-model="model"
        :max="childNum"
        input
        :boundary-links="false"
      />
      <q-btn
        icon="sym_o_delete"
        flat
        round
        size="sm"
        class="hover:text-err"
        title="删除该分支"
        @click="$emit('deleteBranch')"
      />
    </div>
  </div>

  <!-- 正常消息 -->
  <div
    v-else
    class="message-item flex gap-3"
    :class="isUser ? 'flex-row-reverse' : 'flex-row'"
  >
    <!-- 头像 -->
    <div
      class="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-9"
      :class="isUser ? 'bg-sec-c text-on-sec-c' : 'bg-pri text-on-pri'"
    >
      <q-icon
        :name="isUser ? 'sym_o_person' : 'sym_o_smart_toy'"
        size="18px"
      />
    </div>

    <div class="flex flex-col min-w-0 flex-1">
      <!-- 顶部工具条：分支翻页 + 操作 -->
      <div
        class="flex items-center h-9 sticky top-0 z-10 bg-sur"
        :class="isUser ? 'flex-row-reverse' : 'flex-row'"
      >
        <div
          v-if="name"
          class="text-on-sur-var truncate text-sm"
        >
          {{ name }}
        </div>
        <q-space />
        <div class="flex items-center text-sec">
          <template v-if="childNum > 1">
            <q-pagination
              v-model="model"
              :max="childNum"
              input
              :boundary-links="false"
            />
            <q-btn
              v-if="!generating"
              icon="sym_o_delete"
              flat
              round
              size="sm"
              class="hover:text-err"
              title="删除该分支"
              @click="deleteBranch"
            />
          </template>
          <template v-if="actionable">
            <q-btn
              v-if="textContent"
              icon="sym_o_content_copy"
              flat
              round
              size="sm"
              title="复制"
              @click="copy"
            />
            <q-btn
              v-if="isAssistant"
              icon="sym_o_refresh"
              flat
              round
              size="sm"
              title="重新生成"
              @click="$emit('regenerate')"
            />
            <q-btn
              v-if="isUser"
              icon="sym_o_edit"
              flat
              round
              size="sm"
              title="编辑"
              @click="$emit('edit')"
            />
            <q-btn
              v-if="dense && headList.length"
              icon="sym_o_format_list_bulleted"
              flat
              round
              size="sm"
              title="目录"
            >
              <q-menu class="p-2">
                <MdCatalog
                  :scroll-element="scrollContainer || undefined"
                  v-bind="mdCatalogProps"
                  :scroll-element-offset-top="48"
                />
              </q-menu>
            </q-btn>
            <q-btn
              icon="sym_o_more_vert"
              flat
              round
              size="sm"
              title="更多"
            >
              <q-menu>
                <q-list dense>
                  <q-item
                    v-close-popup
                    clickable
                    :class="{ 'route-active': sourceCodeMode }"
                    @click="sourceCodeMode = !sourceCodeMode"
                  >
                    <q-item-section avatar>
                      <q-icon name="sym_o_code" />
                    </q-item-section>
                    <q-item-section>源码模式</q-item-section>
                  </q-item>
                  <q-item
                    v-close-popup
                    clickable
                    @click="directEdit"
                  >
                    <q-item-section avatar>
                      <q-icon name="sym_o_edit_note" />
                    </q-item-section>
                    <q-item-section>直接编辑</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </template>
        </div>
      </div>

      <div
        class="group relative rounded-lg"
        :class="{ 'bg-sur-c-low': isUser }"
      >
        <!-- 推理过程 -->
        <q-expansion-item
          v-if="reasoning"
          icon="sym_o_neurology"
          label="推理过程"
          :default-opened="generating"
          class="bg-sur-c-low of-hidden rounded-md my-2"
          header-class="min-h-40px"
        >
          <div class="px-4 pb-3 text-on-sur-var whitespace-pre-wrap break-word font-code text-sm">
            {{ reasoning.trim() }}
          </div>
        </q-expansion-item>

        <!-- 工具调用 -->
        <div
          v-if="toolBlocks.length"
          class="flex flex-col gap-2 my-2"
        >
          <ToolCallItem
            v-for="(tc, i) in toolBlocks"
            :key="tc.toolCallId || i"
            :call="tc"
          />
        </div>

        <!-- 正文 -->
        <div
          v-if="textContent"
          class="md-body break-word"
          @click="onClick"
        >
          <MdPreview
            :model-value="mdContent"
            v-bind="mdPreviewProps"
            @on-get-catalog="headList = $event"
            @on-html-changed="$emit('rendered')"
            bg-sur
          />
        </div>

        <!-- 流式占位 -->
        <div
          v-else-if="generating && !toolBlocks.length"
          class="flex items-center gap-1 text-on-sur-var py-2 px-1"
        >
          <q-spinner-dots size="24px" />
        </div>

        <!-- 用户附件 -->
        <div
          v-if="userItems.length"
          class="flex flex-wrap gap-2 p-2"
        >
          <MessageImage
            v-for="img in userItems.filter(i => i.mimeType?.startsWith('image/'))"
            :key="img.id"
            :image="img"
            class="h-100px"
          />
          <MessageFile
            v-for="f in userItems.filter(i => !i.mimeType?.startsWith('image/'))"
            :key="f.id"
            :file="f"
          />
        </div>

        <!-- 错误 -->
        <div
          v-if="message.error"
          class="rounded-lg bg-err-c text-on-err-c px-3 py-2 text-sm break-word my-2"
        >
          {{ message.error }}
        </div>

        <!-- 进度 -->
        <q-linear-progress
          v-if="generating"
          indeterminate
          class="mt-2"
        />

        <!-- 模型名 / 时间 -->
        <div
          v-if="!generating"
          class="text-out text-xs absolute left-0 right-0 bottom--1 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex gap-2"
        >
          <span>{{ message.modelName }}</span>
          <span class="ml-a">{{ timeText }}</span>
        </div>
      </div>
    </div>

    <!-- 右侧目录（宽屏） -->
    <div
      v-if="!dense && scrollContainer && headList.length"
      class="max-w-22% shrink-0"
    >
      <MdCatalog
        class="sticky top-2 mt-2 text-on-sur-var"
        v-bind="mdCatalogProps"
        :scroll-element="scrollContainer"
        :scroll-element-offset-top="48"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { copyToClipboard, Dialog, Notify } from 'quasar'
import { MdPreview, MdCatalog, type HeadList } from 'md-editor-v3'
import { db } from 'src/utils/db'
import type { AssistantMessageContent, AssistantToolContent, Message, StoredItem, UserMessageContent } from 'src/utils/types'
import { idDateString } from 'app/src-shared/utils/id'
import { useMdProps } from 'src/composables/useMdProps'
import ToolCallItem from './ToolCallItem.vue'
import MessageImage from './MessageImage.vue'
import MessageFile from './MessageFile.vue'

const props = defineProps<{
  message: Message
  childNum: number
  scrollContainer?: HTMLElement | null
  dense?: boolean
  inputing?: boolean
  itemMap: Record<string, StoredItem>
}>()

const model = defineModel<number>({ default: 1 })

const emit = defineEmits<{
  regenerate: []
  edit: []
  deleteBranch: []
  rendered: []
}>()

const router = useRouter()
const { mdPreviewProps, mdCatalogProps } = useMdProps()
const sourceCodeMode = ref(false)
const headList = ref<HeadList[]>([])

const isUser = computed(() => props.message.type === 'user')
const isAssistant = computed(() => props.message.type === 'assistant')
const name = computed(() => (isAssistant.value ? 'AI 助手' : ''))
const generating = computed(() => ['pending', 'streaming'].includes(props.message.status))
const actionable = computed(() => ['default', 'failed'].includes(props.message.status))

const textBlock = computed(() =>
  props.message.contents.find(
    (c): c is AssistantMessageContent | UserMessageContent =>
      c.type === 'assistant-message' || c.type === 'user-message'
  )
)
const textContent = computed(() => textBlock.value?.text ?? '')
const reasoning = computed(() => {
  const c = props.message.contents.find(
    (c): c is AssistantMessageContent => c.type === 'assistant-message'
  )
  return c?.reasoning
})
const toolBlocks = computed(() =>
  props.message.contents.filter((c): c is AssistantToolContent => c.type === 'assistant-tool')
)
const userItems = computed(() => {
  const c = props.message.contents.find((c): c is UserMessageContent => c.type === 'user-message')
  return (c?.items ?? []).map(id => props.itemMap[id]).filter(Boolean)
})

function wrapCode(text: string) {
  return '```markdown\n' + text + '\n```'
}
const mdContent = computed(() => (sourceCodeMode.value ? wrapCode(textContent.value) : textContent.value))

const timeText = computed(() => {
  try { return idDateString(props.message.id) } catch { return '' }
})

function copy() {
  copyToClipboard(textContent.value).then(() => Notify.create({ message: '已复制', timeout: 1000 }))
}

function deleteBranch() {
  if (props.message.status === 'failed' || generating.value) {
    emit('deleteBranch')
    return
  }
  Dialog.create({
    title: '删除分支',
    message: '确定删除该消息分支？该消息及其后续消息都将被删除。',
    cancel: true,
    ok: { label: '删除', color: 'err', flat: true, noCaps: true }
  }).onOk(() => emit('deleteBranch'))
}

function directEdit() {
  Dialog.create({
    title: '编辑消息',
    prompt: { model: textContent.value, type: 'textarea', outlined: true },
    cancel: true,
    ok: { label: '保存', noCaps: true, unelevated: true, color: 'pri', textColor: 'on-pri' }
  }).onOk((text: string) => {
    const idx = props.message.contents.findIndex(c => c.type === 'assistant-message' || c.type === 'user-message')
    if (idx === -1) return
    const contents = props.message.contents.map((c, i) => (i === idx ? { ...c, text } : c))
    db.messages.update(props.message.id, { contents })
  })
}

// 拦截站内文档链接 /doc/:id，走前端路由
function onClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('a')
  if (!target) return
  const href = target.getAttribute('href') || ''
  if (href.startsWith('/doc/')) {
    e.preventDefault()
    router.push(href)
  }
}
</script>

<style scoped>
.md-body :deep(.md-editor-preview) {
  background-color: transparent;
  font-size: 14px;
  color: var(--a-on-sur);
}
.md-body :deep(a) {
  color: var(--a-pri);
  text-decoration: none;
}
.md-body :deep(a:hover) {
  text-decoration: underline;
}
</style>

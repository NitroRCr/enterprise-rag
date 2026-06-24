<template>
  <div class="flex" :class="isUser ? 'justify-end' : 'justify-start'">
    <!-- 用户消息 -->
    <div v-if="isUser" class="max-w-85% bg-pri-c text-on-pri-c rounded-2xl rounded-tr-md px-4 py-2.5 break-word whitespace-pre-wrap">
      {{ message.content }}
    </div>

    <!-- 助手消息 -->
    <div v-else class="max-w-90% w-full flex gap-2.5">
      <div class="w-8 h-8 rounded-full bg-pri text-on-pri flex items-center justify-center shrink-0 mt-1">
        <q-icon name="sym_o_smart_toy" size="18px" />
      </div>
      <div class="flex-1 min-w-0 flex flex-col gap-2">
        <!-- 推理过程 -->
        <div v-if="message.reasoning" class="rounded-lg bg-sur-c-high text-sm of-hidden">
          <div class="flex items-center gap-1 px-3 py-2 cursor-pointer text-on-sur-var" @click="reasoningOpen = !reasoningOpen">
            <q-icon name="sym_o_neurology" size="16px" />
            <span>推理过程</span>
            <q-icon :name="reasoningOpen ? 'sym_o_expand_less' : 'sym_o_expand_more'" size="16px" />
          </div>
          <q-slide-transition>
            <div v-show="reasoningOpen" class="px-3 pb-3 text-on-sur-var whitespace-pre-wrap break-word border-t border-out-var pt-2">
              {{ message.reasoning }}
            </div>
          </q-slide-transition>
        </div>

        <!-- 工具调用 -->
        <ToolCallItem v-for="call in message.toolCalls" :key="call.id" :call="call" />

        <!-- 正文 -->
        <div
          v-if="message.content"
          class="md-body break-word"
          @click="onClick"
        >
          <MdPreview
            :id="message.id"
            :model-value="message.content"
            :theme="isDark ? 'dark' : 'light'"
            preview-theme="default"
            code-theme="atom"
            :show-code-row-number="false"
          />
        </div>

        <!-- 流式占位 -->
        <div v-else-if="streaming && !message.error && !message.toolCalls?.length" class="flex items-center gap-1 text-on-sur-var py-1">
          <q-spinner-dots size="24px" />
        </div>

        <!-- 错误 -->
        <div v-if="message.error" class="rounded-lg bg-err-c text-on-err-c px-3 py-2 text-sm">
          {{ message.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Dark } from 'quasar'
import { MdPreview } from 'md-editor-v3'
import type { Message } from 'src/utils/types'
import ToolCallItem from './ToolCallItem.vue'

const props = defineProps<{ message: Message; streaming?: boolean }>()
const router = useRouter()

const isUser = computed(() => props.message.role === 'user')
const isDark = computed(() => Dark.isActive)
const reasoningOpen = ref(false)

// 拦截内部文档链接，使用前端路由跳转
function onClick(e: MouseEvent) {
  const target = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
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

<template>
  <q-scroll-area ref="scrollArea" class="h-full">
    <div class="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <MessageItem
        v-for="(m, i) in messages" :key="m.id"
        :message="m"
        :streaming="streaming && i === messages.length - 1"
      />
    </div>
  </q-scroll-area>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import type { QScrollArea } from 'quasar'
import type { Message } from 'src/utils/types'
import MessageItem from './MessageItem.vue'

const props = defineProps<{ messages: Message[]; streaming?: boolean }>()
const scrollArea = ref<QScrollArea>()

function scrollToBottom() {
  nextTick(() => {
    const el = scrollArea.value?.getScrollTarget()
    if (el) scrollArea.value?.setScrollPosition('vertical', el.scrollHeight, 0)
  })
}

watch(() => props.messages.map(m => m.content + (m.reasoning || '') + (m.toolCalls?.length || 0)).join(), scrollToBottom)
watch(() => props.messages.length, scrollToBottom)
</script>

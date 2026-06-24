<template>
  <div class="rounded-2xl bg-sur-c border border-out-var p-2 flex items-end gap-2">
    <q-input
      v-model="text"
      type="textarea" borderless dense autogrow
      class="flex-1 px-2 max-h-40 of-auto"
      placeholder="输入你的问题，回车发送（Shift+Enter 换行）"
      :disable="disabled"
      @keydown="onKeydown"
    />
    <q-btn
      v-if="streaming"
      round unelevated color="err" text-color="on-err" icon="sym_o_stop"
      @click="emit('stop')"
    >
      <q-tooltip>停止</q-tooltip>
    </q-btn>
    <q-btn
      v-else
      round unelevated color="pri" text-color="on-pri" icon="sym_o_arrow_upward"
      :disable="!text.trim() || disabled"
      @click="submit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ streaming?: boolean; disabled?: boolean }>()
const emit = defineEmits<{ send: [string]; stop: [] }>()

const text = ref('')

function submit() {
  const v = text.value.trim()
  if (!v || props.disabled || props.streaming) return
  emit('send', v)
  text.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    submit()
  }
}
</script>

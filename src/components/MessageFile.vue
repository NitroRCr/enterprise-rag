<template>
  <q-chip
    :label="file.name"
    :removable="removable"
    icon="sym_o_description"
    icon-remove="sym_o_close"
    class="max-w-360px"
    :clickable="!!file.contentText"
    @remove="$emit('remove')"
    @click="view"
  />
</template>

<script setup lang="ts">
import { Dialog } from 'quasar'
import type { StoredItem } from 'src/utils/types'

const props = defineProps<{ file: StoredItem; removable?: boolean }>()
defineEmits<{ remove: [] }>()

function view() {
  if (!props.file.contentText) return
  Dialog.create({
    title: props.file.name || '文件内容',
    message: `<pre style="white-space:pre-wrap;word-break:break-word;max-height:60vh;overflow:auto">${escapeHtml(props.file.contentText)}</pre>`,
    html: true,
    ok: { label: '关闭', flat: true, noCaps: true }
  })
}
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}
</script>

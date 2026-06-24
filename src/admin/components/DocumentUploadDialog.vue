<template>
  <q-dialog :model-value="modelValue" @update:model-value="v => emit('update:modelValue', v)">
    <q-card class="bg-sur-c w-full max-w-480px rounded-2xl">
      <q-card-section class="flex items-center gap-2">
        <q-icon name="sym_o_upload_file" size="24px" class="text-pri" />
        <span class="text-lg font-600">上传文档</span>
      </q-card-section>
      <q-card-section class="pt-0">
        <q-file
          v-model="files" multiple outlined dense use-chips color="pri"
          label="选择文件（支持批量）"
          accept=".pdf,.docx,.xlsx,.pptx,.md,.txt"
          :disable="uploading"
        >
          <template #prepend><q-icon name="sym_o_attach_file" /></template>
        </q-file>
        <div class="text-xs text-on-sur-var mt-2">支持 PDF / Word / Excel / PPT / Markdown / 纯文本</div>
        <q-linear-progress v-if="uploading" indeterminate color="pri" class="mt-3 rounded" />
      </q-card-section>
      <q-card-actions align="right" class="px-4 pb-4">
        <q-btn flat no-caps label="取消" :disable="uploading" @click="close" />
        <q-btn
          unelevated color="pri" text-color="on-pri" no-caps label="上传"
          :loading="uploading" :disable="!files || files.length === 0"
          @click="upload"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Notify } from 'quasar'

const props = defineProps<{ modelValue: boolean; knowledgeBaseId: string }>()
const emit = defineEmits<{ 'update:modelValue': [boolean]; uploaded: [] }>()

const files = ref<File[]>([])
const uploading = ref(false)

function close() {
  files.value = []
  emit('update:modelValue', false)
}

async function upload() {
  if (!files.value?.length) return
  uploading.value = true
  try {
    const form = new FormData()
    form.append('knowledgeBaseId', props.knowledgeBaseId)
    for (const f of files.value) form.append('files', f)
    const res = await fetch('/api/documents/upload', { method: 'POST', body: form, credentials: 'include' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(data.error || `上传失败 (${res.status})`)
    }
    Notify.create({ message: '上传成功', color: 'suc', textColor: 'on-suc' })
    emit('uploaded')
    close()
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  } finally {
    uploading.value = false
  }
}
</script>

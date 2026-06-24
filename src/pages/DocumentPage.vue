<template>
  <q-page class="flex flex-col" style="height: calc(100vh - 56px)">
    <div class="flex items-center gap-2 px-4 py-2 border-b border-out-var bg-sur">
      <q-btn flat dense round icon="sym_o_arrow_back" class="text-on-sur-var" @click="back" />
      <div class="flex-1 min-w-0">
        <div class="font-600 truncate">{{ doc?.name || '加载中…' }}</div>
        <div v-if="doc" class="text-xs text-on-sur-var flex items-center gap-1">
          <q-icon name="sym_o_folder" size="14px" /> {{ doc.knowledgeBaseName }}
          <span class="mx-1">·</span>{{ formatBytes(doc.size) }}
        </div>
      </div>
      <q-btn
        v-if="doc" outline no-caps color="pri" icon="sym_o_download" label="下载原文件"
        class="rounded-lg" @click="download"
      />
    </div>

    <q-scroll-area class="flex-1">
      <div class="max-w-4xl mx-auto px-6 py-6">
        <div v-if="loading" class="flex justify-center py-20"><q-spinner size="40px" class="text-pri" /></div>
        <div v-else-if="error" class="text-center text-err py-20">{{ error }}</div>
        <MdPreview
          v-else-if="doc"
          :id="`doc-${doc.id}`"
          :model-value="doc.content"
          :theme="isDark ? 'dark' : 'light'"
          preview-theme="default"
          code-theme="atom"
        />
      </div>
    </q-scroll-area>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Dark } from 'quasar'
import { MdPreview } from 'md-editor-v3'
import { api, unwrap } from 'src/utils/hc'
import { formatBytes } from 'app/src-shared/utils/functions'

interface DocData {
  id: string
  name: string
  knowledgeBaseName: string
  content: string
  size: number
}

const route = useRoute()
const router = useRouter()
const isDark = computed(() => Dark.isActive)

const doc = ref<DocData | null>(null)
const loading = ref(true)
const error = ref('')

async function loadDoc(id: string) {
  loading.value = true
  error.value = ''
  doc.value = null
  try {
    doc.value = await unwrap<DocData>(await api.documents[':id'].$get({ param: { id } }))
  } catch (e) {
    error.value = (e as Error).message || '文档加载失败'
  } finally {
    loading.value = false
  }
}

function download() {
  if (doc.value) window.open(`/api/documents/${doc.value.id}/download`, '_blank')
}
function back() {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

onMounted(() => loadDoc(route.params.id as string))
watch(() => route.params.id, id => { if (id) loadDoc(id as string) })
</script>

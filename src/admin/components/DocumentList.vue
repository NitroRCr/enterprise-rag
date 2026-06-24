<template>
  <div>
    <q-table
      flat :rows="docs" :columns="columns" row-key="id"
      :loading="loading" :pagination="{ rowsPerPage: 10 }"
      class="bg-transparent" no-data-label="该知识库暂无文档"
    >
      <template #body-cell-actions="props">
        <q-td :props="props" class="text-right">
          <q-btn flat dense round size="sm" icon="sym_o_visibility" @click="preview(props.row)">
            <q-tooltip>查看</q-tooltip>
          </q-btn>
          <q-btn flat dense round size="sm" icon="sym_o_download" @click="download(props.row.id)">
            <q-tooltip>下载原文件</q-tooltip>
          </q-btn>
          <q-btn flat dense round size="sm" icon="sym_o_delete" class="text-err" @click="remove(props.row)">
            <q-tooltip>删除</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <q-dialog v-model="previewOpen">
      <q-card class="bg-sur-c w-full max-w-3xl rounded-2xl">
        <q-card-section class="flex items-center gap-2 border-b border-out-var">
          <q-icon name="sym_o_description" class="text-pri" />
          <span class="font-600 truncate">{{ previewDoc?.name }}</span>
          <q-space />
          <q-btn v-close-popup flat dense round icon="sym_o_close" />
        </q-card-section>
        <q-card-section style="max-height: 70vh; overflow: auto">
          <MdPreview
            v-if="previewDoc"
            :id="`adm-${previewDoc.id}`"
            :model-value="previewContent"
            :theme="isDark ? 'dark' : 'light'"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Dark, Dialog as QDialog, Notify, type QTableColumn } from 'quasar'
import { MdPreview } from 'md-editor-v3'
import { api, unwrap } from 'src/utils/hc'
import { formatBytes } from 'app/src-shared/utils/functions'
import type { DocumentInfo } from 'app/src-shared/utils/types'

const props = defineProps<{ knowledgeBaseId: string }>()

const docs = ref<DocumentInfo[]>([])
const loading = ref(false)
const isDark = computed(() => Dark.isActive)

const previewOpen = ref(false)
const previewDoc = ref<DocumentInfo | null>(null)
const previewContent = ref('')

const columns: QTableColumn[] = [
  { name: 'name', label: '文档名称', field: 'name', align: 'left', sortable: true },
  { name: 'ext', label: '类型', field: 'ext', align: 'left' },
  { name: 'size', label: '大小', field: 'size', align: 'left', format: (v: number) => formatBytes(v) },
  { name: 'createdAt', label: '上传时间', field: 'createdAt', align: 'left', sortable: true, format: (v: number) => new Date(v).toLocaleString('zh-CN') },
  { name: 'actions', label: '操作', field: 'id', align: 'right' }
]

async function load() {
  if (!props.knowledgeBaseId) return
  loading.value = true
  try {
    docs.value = await unwrap<DocumentInfo[]>(await api.documents.$get({ query: { knowledgeBaseId: props.knowledgeBaseId } }))
  } finally {
    loading.value = false
  }
}

async function preview(row: DocumentInfo) {
  previewDoc.value = row
  previewContent.value = '加载中…'
  previewOpen.value = true
  const data = await unwrap<{ content: string }>(await api.documents[':id'].$get({ param: { id: row.id } }))
  previewContent.value = data.content
}

function download(id: string) {
  window.open(`/api/documents/${id}/download`, '_blank')
}

function remove(row: DocumentInfo) {
  QDialog.create({
    title: '删除文档',
    message: `确定删除「${row.name}」？此操作不可恢复。`,
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    await unwrap(await api.documents[':id'].$delete({ param: { id: row.id } }))
    Notify.create({ message: '已删除', color: 'suc', textColor: 'on-suc' })
    await load()
  })
}

defineExpose({ load })
onMounted(load)
watch(() => props.knowledgeBaseId, load)
</script>

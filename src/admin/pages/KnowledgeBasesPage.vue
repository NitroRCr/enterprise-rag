<template>
  <q-page class="p-4">
    <div class="flex gap-4 h-full" style="min-height: calc(100vh - 88px)">
      <!-- 知识库列表 -->
      <div class="w-72 shrink-0 flex flex-col">
        <div class="flex items-center justify-between mb-3">
          <span class="text-lg font-600">知识库</span>
          <q-btn round unelevated size="sm" color="pri" text-color="on-pri" icon="sym_o_add" @click="openCreate" />
        </div>
        <div class="flex flex-col gap-2 of-auto">
          <q-card
            v-for="kb in kbs" :key="kb.id" flat
            class="cursor-pointer transition-all"
            :class="kb.id === selectedId ? 'bg-sec-c text-on-sec-c' : 'bg-sur-c hover:bg-sur-c-high'"
            @click="selectedId = kb.id"
          >
            <q-card-section class="p-3">
              <div class="flex items-center gap-1">
                <span class="font-600 truncate flex-1">{{ kb.name }}</span>
                <q-badge v-if="kb.isDefault" color="pri" text-color="on-pri" label="默认" />
              </div>
              <div class="text-xs op-70 mt-1">{{ kb.documentCount }} 个文档</div>
              <div v-if="kb.description" class="text-xs op-70 mt-1 truncate">{{ kb.description }}</div>
            </q-card-section>
          </q-card>
          <div v-if="kbs.length === 0" class="text-center text-sm text-on-sur-var py-6">暂无知识库</div>
        </div>
      </div>

      <!-- 文档管理 -->
      <div class="flex-1 min-w-0">
        <q-card v-if="selected" flat class="bg-sur-c rounded-xl">
          <q-card-section class="flex items-center gap-2 flex-wrap">
            <div class="flex-1 min-w-0">
              <div class="text-lg font-600 truncate">{{ selected.name }}</div>
              <div class="text-xs text-on-sur-var">{{ selected.description || '无描述' }}</div>
            </div>
            <q-btn
              v-if="!selected.isDefault" outline no-caps size="sm" color="pri" icon="sym_o_star"
              label="设为默认" class="rounded-lg" @click="setDefault(selected.id)"
            />
            <q-btn
              outline no-caps size="sm" color="err" icon="sym_o_delete"
              label="删除" class="rounded-lg" @click="removeKb(selected)"
            />
            <q-btn
              unelevated no-caps size="sm" color="pri" text-color="on-pri" icon="sym_o_upload"
              label="上传文档" class="rounded-lg" @click="uploadOpen = true"
            />
          </q-card-section>
          <q-separator class="bg-out-var" />
          <q-card-section>
            <DocumentList ref="docList" :knowledge-base-id="selected.id" />
          </q-card-section>
        </q-card>
        <div v-else class="flex items-center justify-center h-full text-on-sur-var">
          请选择或创建一个知识库
        </div>
      </div>
    </div>

    <DocumentUploadDialog
      v-if="selected"
      v-model="uploadOpen" :knowledge-base-id="selected.id"
      @uploaded="onUploaded"
    />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Dialog as QDialog, Notify } from 'quasar'
import { api, unwrap } from 'src/utils/hc'
import type { KnowledgeBase } from 'app/src-shared/utils/types'
import DocumentList from 'src/admin/components/DocumentList.vue'
import DocumentUploadDialog from 'src/admin/components/DocumentUploadDialog.vue'

const kbs = ref<KnowledgeBase[]>([])
const selectedId = ref<string | null>(null)
const uploadOpen = ref(false)
const docList = ref<InstanceType<typeof DocumentList>>()

const selected = computed(() => kbs.value.find(k => k.id === selectedId.value) || null)

async function load() {
  kbs.value = await unwrap<KnowledgeBase[]>(await api['knowledge-bases'].$get())
  if (!selectedId.value && kbs.value.length) selectedId.value = kbs.value[0].id
  if (selectedId.value && !kbs.value.find(k => k.id === selectedId.value)) {
    selectedId.value = kbs.value[0]?.id ?? null
  }
}

function openCreate() {
  QDialog.create({
    title: '创建知识库',
    prompt: { model: '', type: 'text', label: '知识库名称', isValid: (v: string) => !!v.trim() },
    cancel: true,
    ok: { label: '创建', color: 'pri', textColor: 'on-pri', unelevated: true, noCaps: true }
  }).onOk(async (name: string) => {
    const { id } = await unwrap<{ id: string }>(await api['knowledge-bases'].$post({ json: { name: name.trim(), description: '' } }))
    Notify.create({ message: '已创建', color: 'suc', textColor: 'on-suc' })
    await load()
    selectedId.value = id
  })
}

async function setDefault(id: string) {
  await unwrap(await api['knowledge-bases'][':id'].default.$post({ param: { id } }))
  Notify.create({ message: '已设为默认', color: 'suc', textColor: 'on-suc' })
  await load()
}

function removeKb(kb: KnowledgeBase) {
  QDialog.create({
    title: '删除知识库',
    message: `确定删除「${kb.name}」及其全部文档？`,
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    await unwrap(await api['knowledge-bases'][':id'].$delete({ param: { id: kb.id } }))
    Notify.create({ message: '已删除', color: 'suc', textColor: 'on-suc' })
    selectedId.value = null
    await load()
  })
}

async function onUploaded() {
  await load()
  docList.value?.load()
}

onMounted(load)
</script>

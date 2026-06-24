<template>
  <q-page class="p-4">
    <div class="text-lg font-600 mb-4">默认设置</div>
    <q-card flat class="bg-sur-c rounded-xl max-w-2xl">
      <q-card-section class="flex flex-col gap-4">
        <div>
          <div class="text-sm font-500 mb-1">默认模型</div>
          <div class="text-xs text-on-sur-var mb-2">用户端新建对话时默认选中的模型</div>
          <q-select v-model="defaultModelName" outlined dense color="pri" clearable
            emit-value map-options :options="modelOptions" label="选择默认模型" />
        </div>
        <div>
          <div class="text-sm font-500 mb-1">默认知识库</div>
          <div class="text-xs text-on-sur-var mb-2">用户端新建对话时默认检索的知识库</div>
          <q-select v-model="defaultKnowledgeBaseId" outlined dense color="pri" clearable
            emit-value map-options :options="kbOptions" label="选择默认知识库" />
        </div>
        <div>
          <q-btn unelevated no-caps color="pri" text-color="on-pri" label="保存设置" :loading="saving" class="rounded-lg" @click="save" />
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { api, unwrap } from 'src/utils/hc'
import type { KnowledgeBase, Model } from 'app/src-shared/utils/types'

const defaultModelName = ref<string | null>(null)
const defaultKnowledgeBaseId = ref<string | null>(null)
const models = ref<Model[]>([])
const kbs = ref<KnowledgeBase[]>([])
const saving = ref(false)

const modelOptions = computed(() => models.value.map(m => ({ label: m.label || m.name, value: m.name })))
const kbOptions = computed(() => kbs.value.map(k => ({ label: k.name, value: k.id })))

async function load() {
  const [ms, ks, settings] = await Promise.all([
    unwrap<Model[]>(await api.models.$get()),
    unwrap<KnowledgeBase[]>(await api['knowledge-bases'].$get()),
    unwrap<{ defaultModelName: string | null; defaultKnowledgeBaseId: string | null }>(await api.settings.$get())
  ])
  models.value = ms
  kbs.value = ks
  defaultModelName.value = settings.defaultModelName
  defaultKnowledgeBaseId.value = settings.defaultKnowledgeBaseId
}

async function save() {
  saving.value = true
  try {
    await unwrap(await api.settings.$put({ json: { defaultModelName: defaultModelName.value, defaultKnowledgeBaseId: defaultKnowledgeBaseId.value } }))
    Notify.create({ message: '已保存', color: 'suc', textColor: 'on-suc' })
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

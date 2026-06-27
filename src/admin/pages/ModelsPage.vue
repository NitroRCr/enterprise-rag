<template>
  <q-page class="p-4">
    <div class="flex items-center justify-between mb-4">
      <span class="text-lg font-600">模型</span>
      <q-btn
        unelevated
        no-caps
        color="pri"
        text-color="on-pri"
        icon="sym_o_add"
        label="添加模型"
        class="rounded-lg"
        :disable="providers.length === 0"
        @click="openForm()"
      />
    </div>

    <q-banner
      v-if="providers.length === 0"
      class="bg-warn-c text-on-warn-c rounded-xl mb-4"
    >
      请先在「服务商」页面添加至少一个 AI 服务商。
    </q-banner>

    <q-card
      flat
      class="bg-sur-c rounded-xl"
    >
      <q-table
        flat
        :rows="models"
        :columns="columns"
        row-key="id"
        :loading="loading"
        class="bg-transparent"
        no-data-label="暂无模型"
      >
        <template #body-cell-isDefault="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.isDefault"
              color="pri"
              text-color="on-pri"
              label="默认"
            />
            <q-btn
              v-else
              flat
              dense
              no-caps
              size="sm"
              label="设为默认"
              class="text-pri"
              @click="setDefault(props.row.id)"
            />
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td
            :props="props"
            class="text-right"
          >
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="sym_o_edit"
              @click="openForm(props.row)"
            />
            <q-btn
              flat
              dense
              round
              size="sm"
              icon="sym_o_delete"
              class="text-err"
              @click="remove(props.row)"
            />
          </q-td>
        </template>
      </q-table>
    </q-card>

    <q-dialog v-model="formOpen">
      <q-card class="bg-sur-c w-full max-w-440px rounded-2xl">
        <q-card-section class="text-lg font-600">
          {{ form.id ? '编辑模型' : '添加模型' }}
        </q-card-section>
        <q-card-section class="pt-0 flex flex-col gap-3">
          <q-select
            v-model="form.providerId"
            outlined
            dense
            label="服务商"
            color="pri"
            emit-value
            map-options
            :options="providerOptions"
          />
          <q-input
            v-model="form.name"
            outlined
            dense
            label="模型名"
            color="pri"
          />
          <q-input
            v-model="form.label"
            outlined
            dense
            label="显示名（可选）"
            color="pri"
          />
        </q-card-section>
        <q-card-actions
          align="right"
          class="px-4 pb-4"
        >
          <q-btn
            flat
            no-caps
            label="取消"
            v-close-popup
          />
          <q-btn
            unelevated
            no-caps
            color="pri"
            text-color="on-pri"
            label="保存"
            :loading="saving"
            @click="save"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Dialog, Notify, type QTableColumn } from 'quasar'
import { api, unwrap } from 'src/utils/hc'
import type { Model, Provider } from 'app/src-shared/utils/types'

const models = ref<(Model & { providerName?: string })[]>([])
const providers = ref<Provider[]>([])
const loading = ref(false)
const formOpen = ref(false)
const saving = ref(false)

const form = reactive({ id: '', providerId: '', name: '', label: '' })

const providerOptions = computed(() => providers.value.map(p => ({ label: p.name, value: p.id })))

const columns: QTableColumn[] = [
  { name: 'label', label: '显示名', field: 'label', align: 'left', format: (v: string, r: Model) => v || r.name },
  { name: 'name', label: '模型名', field: 'name', align: 'left' },
  { name: 'providerName', label: '服务商', field: 'providerName', align: 'left' },
  { name: 'isDefault', label: '默认', field: 'isDefault', align: 'center' },
  { name: 'actions', label: '操作', field: 'id', align: 'right' }
]

async function load() {
  loading.value = true
  try {
    const [ms, ps] = await Promise.all([
      unwrap<(Model & { providerName?: string })[]>(await api.models.$get()),
      unwrap<Provider[]>(await api.providers.$get())
    ])
    models.value = ms
    providers.value = ps
  } finally {
    loading.value = false
  }
}

function openForm(row?: Model) {
  if (row) Object.assign(form, { id: row.id, providerId: row.providerId, name: row.name, label: row.label })
  else Object.assign(form, { id: '', providerId: providers.value[0]?.id ?? '', name: '', label: '' })
  formOpen.value = true
}

async function save() {
  if (!form.providerId || !form.name.trim()) {
    Notify.create({ message: '请选择服务商并填写模型名', color: 'warn', textColor: 'on-warn' })
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await unwrap(await api.models[':id'].$patch({ param: { id: form.id }, json: { providerId: form.providerId, name: form.name, label: form.label } }))
    } else {
      await unwrap(await api.models.$post({ json: { providerId: form.providerId, name: form.name, label: form.label } }))
    }
    Notify.create({ message: '已保存', color: 'suc', textColor: 'on-suc' })
    formOpen.value = false
    await load()
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  } finally {
    saving.value = false
  }
}

async function setDefault(id: string) {
  await unwrap(await api.models[':id'].default.$post({ param: { id } }))
  await load()
}

function remove(row: Model) {
  Dialog.create({
    title: '删除模型',
    message: `确定删除「${row.label || row.name}」？`,
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    await unwrap(await api.models[':id'].$delete({ param: { id: row.id } }))
    await load()
  })
}

onMounted(load)
</script>

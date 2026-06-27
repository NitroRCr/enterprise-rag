<template>
  <q-page class="p-4">
    <div class="flex items-center justify-between mb-4">
      <span class="text-lg font-600">AI 服务商</span>
      <q-btn
        unelevated
        no-caps
        color="pri"
        text-color="on-pri"
        icon="sym_o_add"
        label="添加服务商"
        class="rounded-lg"
        @click="openForm()"
      />
    </div>

    <q-card
      flat
      class="bg-sur-c rounded-xl"
    >
      <q-table
        flat
        :rows="providers"
        :columns="columns"
        row-key="id"
        :loading="loading"
        class="bg-transparent"
        no-data-label="暂无服务商"
      >
        <template #body-cell-enabled="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.enabled ? 'suc' : 'out'"
              :text-color="props.row.enabled ? 'on-suc' : 'on-sur'"
              :label="props.row.enabled ? '启用' : '停用'"
            />
          </q-td>
        </template>
        <template #body-cell-hasApiKey="props">
          <q-td :props="props">
            <q-icon
              :name="props.row.hasApiKey ? 'sym_o_key' : 'sym_o_key_off'"
              :class="props.row.hasApiKey ? 'text-suc' : 'text-on-sur-var'"
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
          {{ form.id ? '编辑服务商' : '添加服务商' }}
        </q-card-section>
        <q-card-section class="pt-0 flex flex-col gap-3">
          <q-input
            v-model="form.name"
            outlined
            dense
            label="名称"
            color="pri"
          />
          <q-input
            v-model="form.baseUrl"
            outlined
            dense
            label="Base URL"
            placeholder="https://api.openai.com/v1"
            color="pri"
          />
          <q-input
            v-model="form.apiKey"
            outlined
            dense
            type="password"
            color="pri"
            :label="form.id ? 'API Key（留空则不修改）' : 'API Key'"
          />
          <q-toggle
            v-model="form.enabled"
            label="启用"
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
import { onMounted, reactive, ref } from 'vue'
import { Dialog, Notify, type QTableColumn } from 'quasar'
import { api, unwrap } from 'src/utils/hc'
import type { Provider } from 'app/src-shared/utils/types'

const providers = ref<Provider[]>([])
const loading = ref(false)
const formOpen = ref(false)
const saving = ref(false)

const form = reactive({ id: '', name: '', baseUrl: '', apiKey: '', enabled: true })

const columns: QTableColumn[] = [
  { name: 'name', label: '名称', field: 'name', align: 'left' },
  { name: 'baseUrl', label: 'Base URL', field: 'baseUrl', align: 'left' },
  { name: 'hasApiKey', label: 'API Key', field: 'hasApiKey', align: 'center' },
  { name: 'enabled', label: '状态', field: 'enabled', align: 'center' },
  { name: 'actions', label: '操作', field: 'id', align: 'right' }
]

async function load() {
  loading.value = true
  try {
    providers.value = await unwrap<Provider[]>(await api.providers.$get())
  } finally {
    loading.value = false
  }
}

function openForm(row?: Provider) {
  if (row) {
    Object.assign(form, { id: row.id, name: row.name, baseUrl: row.baseUrl, apiKey: '', enabled: row.enabled })
  } else {
    Object.assign(form, { id: '', name: '', baseUrl: '', apiKey: '', enabled: true })
  }
  formOpen.value = true
}

async function save() {
  if (!form.name.trim() || !form.baseUrl.trim()) {
    Notify.create({ message: '请填写名称与 Base URL', color: 'warn', textColor: 'on-warn' })
    return
  }
  saving.value = true
  try {
    if (form.id) {
      await unwrap(await api.providers[':id'].$patch({
        param: { id: form.id },
        json: { name: form.name, baseUrl: form.baseUrl, apiKey: form.apiKey, enabled: form.enabled }
      }))
    } else {
      await unwrap(await api.providers.$post({
        json: { name: form.name, baseUrl: form.baseUrl, apiKey: form.apiKey, enabled: form.enabled }
      }))
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

function remove(row: Provider) {
  Dialog.create({
    title: '删除服务商',
    message: `确定删除「${row.name}」？`,
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    await unwrap(await api.providers[':id'].$delete({ param: { id: row.id } }))
    await load()
  })
}

onMounted(load)
</script>

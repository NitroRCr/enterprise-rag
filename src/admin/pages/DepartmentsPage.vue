<template>
  <q-page class="p-4">
    <div class="flex gap-4 items-start flex-wrap lg:flex-nowrap">
      <!-- 部门管理 -->
      <div class="w-full lg:w-96 shrink-0">
        <div class="flex items-center justify-between mb-3">
          <span class="text-lg font-600">部门</span>
          <q-btn
            round
            unelevated
            size="sm"
            color="pri"
            text-color="on-pri"
            icon="sym_o_add"
            @click="openCreate"
          />
        </div>
        <q-card
          flat
          class="bg-sur-c rounded-xl"
        >
          <q-list separator>
            <q-item
              v-for="d in departments"
              :key="d.id"
            >
              <q-item-section>
                <q-item-label class="font-500">
                  {{ d.name }}
                </q-item-label>
                <q-item-label caption>
                  {{ d.userCount ?? 0 }} 名成员
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="flex">
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="sym_o_edit"
                    class="text-pri"
                    @click="openRename(d)"
                  />
                  <q-btn
                    flat
                    round
                    dense
                    size="sm"
                    icon="sym_o_delete"
                    class="text-err"
                    @click="removeDept(d)"
                  />
                </div>
              </q-item-section>
            </q-item>
            <q-item v-if="departments.length === 0">
              <q-item-section class="text-center text-on-sur-var py-4">
                暂无部门
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <!-- 知识库 ↔ 部门 关联 -->
      <div class="flex-1 min-w-0 w-full">
        <div class="text-lg font-600 mb-3">
          知识库授权
        </div>
        <q-card
          flat
          class="bg-sur-c rounded-xl"
        >
          <q-list separator>
            <q-item
              v-for="kb in kbs"
              :key="kb.id"
            >
              <q-item-section>
                <q-item-label class="font-500">
                  {{ kb.name }}
                </q-item-label>
                <q-item-label caption>
                  {{ kb.documentCount ?? 0 }} 个文档
                </q-item-label>
              </q-item-section>
              <q-item-section style="min-width: 260px; max-width: 420px">
                <q-select
                  :model-value="kb.departmentIds ?? []"
                  multiple
                  dense
                  outlined
                  options-dense
                  use-chips
                  emit-value
                  map-options
                  color="pri"
                  :options="deptOptions"
                  label="可访问部门"
                  hint="留空则仅管理员可见"
                  @update:model-value="v => saveKbDepts(kb, v)"
                >
                  <template #selected-item="scope">
                    <q-chip
                      dense
                      removable
                      size="sm"
                      class="bg-sec-c text-on-sec-c"
                      @remove="scope.removeAtIndex(scope.index)"
                    >
                      {{ scope.opt.label }}
                    </q-chip>
                  </template>
                </q-select>
              </q-item-section>
            </q-item>
            <q-item v-if="kbs.length === 0">
              <q-item-section class="text-center text-on-sur-var py-4">
                暂无知识库
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Dialog as QDialog, Notify } from 'quasar'
import { api, unwrap } from 'src/utils/hc'
import type { Department, KnowledgeBase } from 'app/src-shared/utils/types'

const departments = ref<Department[]>([])
const kbs = ref<KnowledgeBase[]>([])

const deptOptions = computed(() => departments.value.map(d => ({ label: d.name, value: d.id })))

async function loadDepts() {
  departments.value = await unwrap<Department[]>(await api.departments.$get())
}
async function loadKbs() {
  kbs.value = await unwrap<KnowledgeBase[]>(await api['knowledge-bases'].$get())
}
async function loadAll() {
  await Promise.all([loadDepts(), loadKbs()])
}

function openCreate() {
  QDialog.create({
    title: '新增部门',
    prompt: { model: '', type: 'text', label: '部门名称', isValid: (v: string) => !!v.trim() },
    cancel: true,
    ok: { label: '创建', color: 'pri', textColor: 'on-pri', unelevated: true, noCaps: true }
  }).onOk(async (name: string) => {
    await unwrap(await api.departments.$post({ json: { name: name.trim() } }))
    Notify.create({ message: '已创建', color: 'suc', textColor: 'on-suc' })
    await loadDepts()
  })
}

function openRename(d: Department) {
  QDialog.create({
    title: '重命名部门',
    prompt: { model: d.name, type: 'text', label: '部门名称', isValid: (v: string) => !!v.trim() },
    cancel: true,
    ok: { label: '保存', color: 'pri', textColor: 'on-pri', unelevated: true, noCaps: true }
  }).onOk(async (name: string) => {
    await unwrap(await api.departments[':id'].$patch({ param: { id: d.id }, json: { name: name.trim() } }))
    Notify.create({ message: '已保存', color: 'suc', textColor: 'on-suc' })
    await loadDepts()
  })
}

function removeDept(d: Department) {
  QDialog.create({
    title: '删除部门',
    message: `确定删除「${d.name}」？该部门下用户将失去归属，知识库关联也会解除。`,
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    await unwrap(await api.departments[':id'].$delete({ param: { id: d.id } }))
    Notify.create({ message: '已删除', color: 'suc', textColor: 'on-suc' })
    await loadAll()
  })
}

async function saveKbDepts(kb: KnowledgeBase, departmentIds: string[]) {
  kb.departmentIds = departmentIds
  await unwrap(await api.departments.kb[':kbId'].$put({ param: { kbId: kb.id }, json: { departmentIds } }))
  Notify.create({ message: '授权已更新', color: 'suc', textColor: 'on-suc', timeout: 800 })
}

onMounted(loadAll)
</script>

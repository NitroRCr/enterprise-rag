<template>
  <q-page class="p-4">
    <div class="text-lg font-600 mb-4">
      用户管理
    </div>
    <q-card
      flat
      class="bg-sur-c rounded-xl"
    >
      <q-table
        flat
        :rows="users"
        :columns="columns"
        row-key="id"
        :loading="loading"
        class="bg-transparent"
        no-data-label="暂无用户"
      >
        <template #body-cell-role="props">
          <q-td :props="props">
            <q-badge
              :color="props.row.role === 'admin' ? 'pri' : 'out'"
              :text-color="props.row.role === 'admin' ? 'on-pri' : 'on-sur'"
              :label="props.row.role === 'admin' ? '管理员' : '普通用户'"
            />
          </q-td>
        </template>
        <template #body-cell-banned="props">
          <q-td :props="props">
            <q-badge
              v-if="props.row.banned"
              color="err"
              text-color="on-err"
              label="已封禁"
            />
            <span
              v-else
              class="text-on-sur-var"
            >—</span>
          </q-td>
        </template>
        <template #body-cell-department="props">
          <q-td :props="props">
            <q-select
              :model-value="props.row.departmentId ?? null"
              :options="deptOptions"
              dense
              outlined
              options-dense
              emit-value
              map-options
              clearable
              color="pri"
              label="未分配"
              style="min-width: 140px"
              @update:model-value="v => assignDept(props.row, v)"
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
              no-caps
              size="sm"
              :label="props.row.role === 'admin' ? '降为用户' : '设为管理员'"
              class="text-pri"
              @click="toggleRole(props.row)"
            />
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              :label="props.row.banned ? '解封' : '封禁'"
              @click="toggleBan(props.row)"
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
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Dialog as QDialog, Notify, type QTableColumn } from 'quasar'
import { authClient } from 'src/utils/auth-client'
import { api, unwrap } from 'src/utils/hc'
import type { Department } from 'app/src-shared/utils/types'

interface AdminUser {
  id: string
  email: string
  name: string
  role?: string | null
  banned?: boolean | null
  departmentId?: string | null
  createdAt: string | Date
}

const session = authClient.useSession()
const users = ref<AdminUser[]>([])
const departments = ref<Department[]>([])
const loading = ref(false)

const deptOptions = computed(() => departments.value.map(d => ({ label: d.name, value: d.id })))

const columns: QTableColumn[] = [
  { name: 'name', label: '姓名', field: 'name', align: 'left' },
  { name: 'email', label: '邮箱', field: 'email', align: 'left' },
  { name: 'role', label: '角色', field: 'role', align: 'center' },
  { name: 'department', label: '部门', field: 'departmentId', align: 'left' },
  { name: 'banned', label: '状态', field: 'banned', align: 'center' },
  { name: 'createdAt', label: '注册时间', field: 'createdAt', align: 'left', format: (v: string) => new Date(v).toLocaleString('zh-CN') },
  { name: 'actions', label: '操作', field: 'id', align: 'right' }
]

async function load() {
  loading.value = true
  try {
    const [res, depts, userMap] = await Promise.all([
      authClient.admin.listUsers({ query: { limit: 100 } }),
      unwrap<Department[]>(await api.departments.$get()),
      unwrap<{ id: string; departmentId: string | null }[]>(await api.departments['user-map'].$get())
    ])
    departments.value = depts
    const deptById = new Map(userMap.map(u => [u.id, u.departmentId]))
    users.value = ((res.data?.users ?? []) as AdminUser[]).map(u => ({
      ...u,
      departmentId: deptById.get(u.id) ?? null
    }))
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  } finally {
    loading.value = false
  }
}

async function assignDept(u: AdminUser, departmentId: string | null) {
  u.departmentId = departmentId
  await unwrap(await api.departments.users[':userId'].$patch({ param: { userId: u.id }, json: { departmentId } }))
  Notify.create({ message: '部门已更新', color: 'suc', textColor: 'on-suc', timeout: 800 })
}

async function toggleRole(u: AdminUser) {
  // 防止管理员将自己降级
  if (u.id === session.value.data?.user.id && u.role === 'admin') {
    Notify.create({ message: '不能降级自己的管理员角色', color: 'warn', textColor: 'on-warn' })
    return
  }
  const role = u.role === 'admin' ? 'user' : 'admin'
  const res = await authClient.admin.setRole({ userId: u.id, role })
  if (res.error) return Notify.create({ message: res.error.message || '操作失败', color: 'err', textColor: 'on-err' })
  await load()
}

async function toggleBan(u: AdminUser) {
  const res = u.banned
    ? await authClient.admin.unbanUser({ userId: u.id })
    : await authClient.admin.banUser({ userId: u.id })
  if (res.error) return Notify.create({ message: res.error.message || '操作失败', color: 'err', textColor: 'on-err' })
  await load()
}

function remove(u: AdminUser) {
  // 防止管理员删除自己
  if (u.id === session.value.data?.user.id) {
    Notify.create({ message: '不能删除自己的账号', color: 'warn', textColor: 'on-warn' })
    return
  }
  QDialog.create({
    title: '删除用户',
    message: `确定删除「${u.email}」？`,
    cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    const res = await authClient.admin.removeUser({ userId: u.id })
    if (res.error) return Notify.create({ message: res.error.message || '删除失败', color: 'err', textColor: 'on-err' })
    await load()
  })
}

onMounted(load)
</script>

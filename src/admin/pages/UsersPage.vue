<template>
  <q-page class="p-4">
    <div class="text-lg font-600 mb-4">用户管理</div>
    <q-card flat class="bg-sur-c rounded-xl">
      <q-table flat :rows="users" :columns="columns" row-key="id" :loading="loading" class="bg-transparent" no-data-label="暂无用户">
        <template #body-cell-role="props">
          <q-td :props="props">
            <q-badge :color="props.row.role === 'admin' ? 'pri' : 'out'" :text-color="props.row.role === 'admin' ? 'on-pri' : 'on-sur'" :label="props.row.role === 'admin' ? '管理员' : '普通用户'" />
          </q-td>
        </template>
        <template #body-cell-banned="props">
          <q-td :props="props">
            <q-badge v-if="props.row.banned" color="err" text-color="on-err" label="已封禁" />
            <span v-else class="text-on-sur-var">—</span>
          </q-td>
        </template>
        <template #body-cell-actions="props">
          <q-td :props="props" class="text-right">
            <q-btn flat dense no-caps size="sm" :label="props.row.role === 'admin' ? '降为用户' : '设为管理员'" class="text-pri" @click="toggleRole(props.row)" />
            <q-btn flat dense no-caps size="sm" :label="props.row.banned ? '解封' : '封禁'" @click="toggleBan(props.row)" />
            <q-btn flat dense round size="sm" icon="sym_o_delete" class="text-err" @click="remove(props.row)" />
          </q-td>
        </template>
      </q-table>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Dialog as QDialog, Notify, type QTableColumn } from 'quasar'
import { authClient } from 'src/utils/auth-client'

interface AdminUser {
  id: string
  email: string
  name: string
  role?: string | null
  banned?: boolean | null
  createdAt: string | Date
}

const users = ref<AdminUser[]>([])
const loading = ref(false)

const columns: QTableColumn[] = [
  { name: 'name', label: '姓名', field: 'name', align: 'left' },
  { name: 'email', label: '邮箱', field: 'email', align: 'left' },
  { name: 'role', label: '角色', field: 'role', align: 'center' },
  { name: 'banned', label: '状态', field: 'banned', align: 'center' },
  { name: 'createdAt', label: '注册时间', field: 'createdAt', align: 'left', format: (v: string) => new Date(v).toLocaleString('zh-CN') },
  { name: 'actions', label: '操作', field: 'id', align: 'right' }
]

async function load() {
  loading.value = true
  try {
    const res = await authClient.admin.listUsers({ query: { limit: 100 } })
    users.value = (res.data?.users ?? []) as AdminUser[]
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  } finally {
    loading.value = false
  }
}

async function toggleRole(u: AdminUser) {
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
  QDialog.create({
    title: '删除用户', message: `确定删除「${u.email}」？`, cancel: true,
    ok: { label: '删除', color: 'err', textColor: 'on-err', unelevated: true, noCaps: true }
  }).onOk(async () => {
    const res = await authClient.admin.removeUser({ userId: u.id })
    if (res.error) return Notify.create({ message: res.error.message || '删除失败', color: 'err', textColor: 'on-err' })
    await load()
  })
}

onMounted(load)
</script>

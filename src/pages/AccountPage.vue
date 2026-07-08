<template>
  <q-page class="flex justify-center">
    <div class="w-full max-w-640px p-4 flex flex-col gap-4">
      <div class="text-lg font-600 mt-2">
        我的账号
      </div>

      <!-- 基本信息 -->
      <q-card
        flat
        class="bg-sur-c rounded-xl"
      >
        <div class="p-5 flex items-center gap-4">
          <div class="w-14 h-14 rounded-2xl bg-pri text-on-pri flex items-center justify-center shrink-0">
            <q-icon
              name="sym_o_person"
              size="30px"
            />
          </div>
          <div class="min-w-0">
            <div class="text-base font-600 truncate">
              {{ profile?.name || '—' }}
            </div>
            <div class="text-sm text-on-sur-var truncate">
              {{ profile?.email }}
            </div>
          </div>
          <q-space />
          <q-badge
            :color="profile?.role === 'admin' ? 'pri' : 'out'"
            :text-color="profile?.role === 'admin' ? 'on-pri' : 'on-sur'"
            :label="profile?.role === 'admin' ? '管理员' : '普通用户'"
          />
        </div>
        <q-separator />
        <q-list>
          <q-item>
            <q-item-section avatar>
              <q-icon
                name="sym_o_badge"
                class="text-on-sur-var"
              />
            </q-item-section>
            <q-item-section>姓名</q-item-section>
            <q-item-section side>
              <span class="text-on-sur">{{ profile?.name || '—' }}</span>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon
                name="sym_o_mail"
                class="text-on-sur-var"
              />
            </q-item-section>
            <q-item-section>邮箱</q-item-section>
            <q-item-section side>
              <span class="text-on-sur">{{ profile?.email }}</span>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon
                name="sym_o_apartment"
                class="text-on-sur-var"
              />
            </q-item-section>
            <q-item-section>部门</q-item-section>
            <q-item-section side>
              <span class="text-on-sur">{{ profile?.department?.name || '未分配' }}</span>
            </q-item-section>
          </q-item>
          <q-item>
            <q-item-section avatar>
              <q-icon
                name="sym_o_schedule"
                class="text-on-sur-var"
              />
            </q-item-section>
            <q-item-section>注册时间</q-item-section>
            <q-item-section side>
              <span class="text-on-sur">{{ createdAtText }}</span>
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <!-- 修改密码 -->
      <q-card
        flat
        class="bg-sur-c rounded-xl"
      >
        <div class="px-5 pt-4 pb-1 text-base font-600">
          修改密码
        </div>
        <q-form
          class="p-5 pt-2 flex flex-col gap-3"
          @submit.prevent="submitPassword"
        >
          <q-input
            v-model="currentPassword"
            outlined
            dense
            type="password"
            label="当前密码"
            color="pri"
            :disable="saving"
            :rules="[v => !!v || '请输入当前密码']"
            hide-bottom-space
          />
          <q-input
            v-model="newPassword"
            outlined
            dense
            type="password"
            label="新密码"
            color="pri"
            :disable="saving"
            :rules="[v => (v && v.length >= 8) || '密码至少 8 位']"
            hide-bottom-space
          />
          <q-input
            v-model="confirmPassword"
            outlined
            dense
            type="password"
            label="确认新密码"
            color="pri"
            :disable="saving"
            :rules="[v => v === newPassword || '两次输入的密码不一致']"
            hide-bottom-space
          />
          <q-checkbox
            v-model="revokeOthers"
            label="修改后退出其他设备的登录"
            color="pri"
            dense
            class="text-sm text-on-sur-var mt-1"
          />
          <q-btn
            type="submit"
            unelevated
            color="pri"
            text-color="on-pri"
            no-caps
            :loading="saving"
            class="rounded-lg h-11 mt-2 self-start px-6"
            label="保存新密码"
          />
        </q-form>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Notify } from 'quasar'
import { authClient } from 'src/utils/auth-client'
import { api, unwrap } from 'src/utils/hc'

interface Profile {
  id: string
  name: string
  email: string
  role: string
  createdAt: string | number
  department: { id: string; name: string } | null
}

const profile = ref<Profile | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const revokeOthers = ref(false)
const saving = ref(false)

const createdAtText = computed(() => {
  if (!profile.value?.createdAt) return '—'
  return new Date(profile.value.createdAt).toLocaleString('zh-CN')
})

async function load() {
  try {
    profile.value = await unwrap<Profile>(await api.me.$get())
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  }
}

async function submitPassword() {
  if (newPassword.value.length < 8 || newPassword.value !== confirmPassword.value) return
  saving.value = true
  try {
    const res = await authClient.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      revokeOtherSessions: revokeOthers.value
    })
    if (res.error) {
      Notify.create({ message: res.error.message || '修改失败', color: 'err', textColor: 'on-err' })
      return
    }
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    Notify.create({ message: '密码修改成功', color: 'suc', textColor: 'on-suc' })
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

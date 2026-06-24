<template>
  <q-layout view="lHh Lpr lFf">
    <template v-if="state === 'ok'">
      <q-header bordered class="bg-sur-c text-on-sur">
        <q-toolbar class="h-14 px-3">
          <q-icon name="sym_o_admin_panel_settings" size="24px" class="text-pri" />
          <span class="text-base font-600 ml-2">{{ siteName }} · 管理后台</span>
          <q-space />
          <q-btn flat dense round :icon="isDark ? 'sym_o_light_mode' : 'sym_o_dark_mode'" class="text-on-sur-var" @click="toggleDark" />
          <q-btn flat dense round icon="sym_o_logout" class="text-on-sur-var ml-1" @click="logout">
            <q-tooltip>退出登录</q-tooltip>
          </q-btn>
        </q-toolbar>
      </q-header>

      <q-drawer show-if-above :width="220" :model-value="true" class="bg-sur-c-low">
        <q-list padding class="text-on-sur">
          <q-item v-for="n in nav" :key="n.to" v-ripple clickable :to="n.to" exact class="rounded-lg mx-2 my-1">
            <q-item-section avatar><q-icon :name="n.icon" /></q-item-section>
            <q-item-section>{{ n.label }}</q-item-section>
          </q-item>
        </q-list>
      </q-drawer>

      <q-page-container>
        <router-view />
      </q-page-container>
    </template>

    <!-- 加载 / 无权限 / 领取管理员 -->
    <div v-else class="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-sur text-on-sur p-6 text-center">
      <template v-if="state === 'loading'">
        <q-spinner size="40px" class="text-pri" />
      </template>
      <template v-else-if="state === 'acquire'">
        <q-icon name="sym_o_shield_person" size="56px" class="text-pri" />
        <div class="text-xl font-600">成为管理员</div>
        <div class="text-on-sur-var max-w-sm">系统尚无管理员。你是首位登录用户，可领取管理员角色以使用管理后台。</div>
        <q-btn unelevated color="pri" text-color="on-pri" no-caps label="领取管理员角色" :loading="acquiring" class="rounded-lg" @click="acquire" />
        <q-btn flat no-caps label="退出登录" class="text-on-sur-var" @click="logout" />
      </template>
      <template v-else>
        <q-icon name="sym_o_block" size="56px" class="text-err" />
        <div class="text-xl font-600">无管理权限</div>
        <div class="text-on-sur-var">当前账号不是管理员，无法访问管理后台。</div>
        <q-btn flat no-caps label="退出登录" class="text-on-sur-var" @click="logout" />
      </template>
    </div>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Dark, Notify } from 'quasar'
import { authClient, signOut } from 'src/utils/auth-client'
import { api, unwrap } from 'src/utils/hc'

const router = useRouter()
const session = authClient.useSession()
const isDark = computed(() => Dark.isActive)

const state = ref<'loading' | 'ok' | 'acquire' | 'noperm'>('loading')
const siteName = ref('企业知识库')
const acquiring = ref(false)

const nav = [
  { to: '/knowledge-bases', label: '知识库', icon: 'sym_o_menu_book' },
  { to: '/providers', label: '服务商', icon: 'sym_o_dns' },
  { to: '/models', label: '模型', icon: 'sym_o_smart_toy' },
  { to: '/settings', label: '默认设置', icon: 'sym_o_settings' },
  { to: '/users', label: '用户', icon: 'sym_o_group' }
]

watch(session, async s => {
  if (s.isPending) return
  if (!s.data) {
    router.replace({ name: 'auth', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  const cfg = await unwrap<{ siteName: string; hasAdmin: boolean }>(await api.settings.config.$get()).catch(() => null)
  if (cfg) siteName.value = cfg.siteName
  if (s.data.user.role === 'admin') {
    state.value = 'ok'
  } else if (cfg && !cfg.hasAdmin) {
    state.value = 'acquire'
  } else {
    state.value = 'noperm'
  }
}, { immediate: true })

async function acquire() {
  acquiring.value = true
  try {
    await unwrap(await api.settings['acquire-admin'].$post())
    Notify.create({ message: '已成为管理员', color: 'suc', textColor: 'on-suc' })
    location.reload()
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  } finally {
    acquiring.value = false
  }
}
function toggleDark() { Dark.toggle() }
async function logout() {
  await signOut()
  router.replace({ name: 'auth' })
}
</script>

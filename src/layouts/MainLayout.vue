<template>
  <q-layout view="lHh Lpr lFf">
    <q-header
      bordered
      class="bg-sur-c text-on-sur"
    >
      <q-toolbar class="h-14 px-2">
        <q-btn
          flat
          dense
          round
          icon="sym_o_menu"
          class="text-on-sur-var"
          @click="drawer = !drawer"
        />
        <div
          class="flex items-center gap-2 ml-1 cursor-pointer"
          @click="goHome"
        >
          <q-icon
            name="sym_o_menu_book"
            size="24px"
            class="text-pri"
          />
          <span class="text-base font-600">{{ settings.siteName }}</span>
        </div>
        <q-space />
        <q-btn
          flat
          dense
          round
          :icon="isDark ? 'sym_o_light_mode' : 'sym_o_dark_mode'"
          class="text-on-sur-var"
          @click="toggleDark"
        >
          <q-tooltip>切换主题</q-tooltip>
        </q-btn>
        <q-btn
          flat
          dense
          round
          icon="sym_o_account_circle"
          class="text-on-sur-var ml-1"
        >
          <q-menu
            anchor="bottom right"
            self="top right"
          >
            <div class="bg-sur-c min-w-200px py-2">
              <div class="px-4 py-2 text-sm text-on-sur-var break-word">
                {{ userEmail }}
              </div>
              <q-separator class="my-1" />
              <q-item
                v-close-popup
                clickable
                @click="logout"
              >
                <q-item-section avatar>
                  <q-icon name="sym_o_logout" />
                </q-item-section>
                <q-item-section>退出登录</q-item-section>
              </q-item>
            </div>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="drawer"
      show-if-above
      :width="280"
      class="bg-sur-c-low"
    >
      <ConversationList />
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Dark } from 'quasar'
import { authClient, signOut } from 'src/utils/auth-client'
import { useSettingsStore } from 'src/stores/settings'
import { useChat } from 'src/composables/useChat'
import ConversationList from 'components/ConversationList.vue'

const router = useRouter()
const settings = useSettingsStore()
const { refreshDialogs, setUser } = useChat()

const drawer = ref(true)
const session = authClient.useSession()
const isDark = computed(() => Dark.isActive)
const userEmail = computed(() => session.value.data?.user?.email ?? '')

let initialized = false
watch(session, async s => {
  if (s.isPending) return
  if (!s.data) {
    await setUser(null)
    initialized = false
    router.replace({ name: 'auth', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  // 切换当前用户，使本地对话按用户隔离
  await setUser(s.data.user.id)
  if (!initialized) {
    initialized = true
    await settings.load().catch(() => {})
    await refreshDialogs()
  }
}, { immediate: true })

function toggleDark() {
  Dark.toggle()
}
function goHome() {
  router.push('/')
}
async function logout() {
  await signOut()
  router.replace({ name: 'auth' })
}
</script>

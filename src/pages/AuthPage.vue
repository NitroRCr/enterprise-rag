<template>
  <q-card flat class="w-full max-w-400px bg-sur-c rounded-2xl shadow-lg of-hidden">
    <div class="px-8 pt-8 pb-2 flex flex-col items-center">
      <div class="w-14 h-14 rounded-2xl bg-pri text-on-pri flex items-center justify-center mb-3">
        <q-icon name="sym_o_menu_book" size="32px" />
      </div>
      <div class="text-xl font-600">{{ siteName }}</div>
      <div class="text-sm text-on-sur-var mt-1">{{ mode === 'signin' ? '登录以使用知识库问答' : '注册新账号' }}</div>
    </div>

    <q-form class="px-8 py-4 flex flex-col gap-3" @submit.prevent="submit">
      <q-input
        v-if="mode === 'signup'"
        v-model="name" outlined dense label="姓名" :disable="loading"
        color="pri" class="rounded"
      />
      <q-input
        v-model="email" outlined dense type="email" label="邮箱" :disable="loading"
        color="pri" :rules="[v => !!v || '请输入邮箱']" hide-bottom-space
      />
      <q-input
        v-model="password" outlined dense type="password" label="密码" :disable="loading"
        color="pri" :rules="[v => (v && v.length >= 6) || '密码至少 6 位']" hide-bottom-space
      />
      <q-btn
        type="submit" unelevated color="pri" text-color="on-pri" no-caps
        :loading="loading" class="rounded-lg h-11 mt-2"
        :label="mode === 'signin' ? '登录' : '注册'"
      />
    </q-form>

    <div class="px-8 pb-8 text-center text-sm text-on-sur-var">
      {{ mode === 'signin' ? '还没有账号？' : '已有账号？' }}
      <span class="pri-link cursor-pointer font-500" @click="toggle">
        {{ mode === 'signin' ? '立即注册' : '去登录' }}
      </span>
    </div>
  </q-card>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Notify } from 'quasar'
import { signIn, signUp } from 'src/utils/auth-client'
import { api, unwrap } from 'src/utils/hc'

const route = useRoute()
const router = useRouter()

const mode = ref<'signin' | 'signup'>('signin')
const name = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const siteName = ref('企业知识库')

onMounted(async () => {
  try {
    const cfg = await unwrap<{ siteName: string; hasAdmin: boolean }>(await api.settings.config.$get())
    siteName.value = cfg.siteName
  } catch { /* ignore */ }
})

function toggle() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin'
}

async function submit() {
  if (!email.value || password.value.length < 6) return
  loading.value = true
  try {
    const res = mode.value === 'signin'
      ? await signIn.email({ email: email.value, password: password.value })
      : await signUp.email({ email: email.value, password: password.value, name: name.value || email.value.split('@')[0] })
    if (res.error) {
      Notify.create({ message: res.error.message || '操作失败', color: 'err', textColor: 'on-err' })
    } else {
      const redirect = (route.query.redirect as string) || '/'
      await router.replace(redirect)
    }
  } finally {
    loading.value = false
  }
}
</script>

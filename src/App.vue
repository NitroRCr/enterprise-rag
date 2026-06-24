<template>
  <router-view />
</template>

<script setup lang="ts">
import { Dark } from 'quasar'
import { useSetTheme } from 'src/composables/useSetTheme'
import 'md-editor-v3/lib/preview.css'

// 跟随系统亮暗模式
Dark.set('auto')
// 应用企业蓝 Material You 主题
useSetTheme(230)
</script>

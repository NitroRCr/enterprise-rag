<template>
  <q-select
    :model-value="modelValue"
    dense outlined options-dense
    :options="options" emit-value map-options
    color="pri" label="模型" class="min-w-160px"
    @update:model-value="v => emit('update:modelValue', v)"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from 'src/stores/settings'

defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ 'update:modelValue': [string | null] }>()

const settings = useSettingsStore()
const options = computed(() => settings.models.map(m => ({ label: m.label || m.name, value: m.name })))
</script>

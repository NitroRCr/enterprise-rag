<template>
  <q-select
    :model-value="modelValue"
    multiple dense outlined options-dense use-chips
    :options="options" emit-value map-options
    color="pri" label="知识库" class="min-w-180px"
    @update:model-value="v => emit('update:modelValue', v)"
  >
    <template #selected-item="scope">
      <q-chip
        dense removable size="sm" class="bg-sec-c text-on-sec-c"
        @remove="scope.removeAtIndex(scope.index)"
      >
        {{ scope.opt.label }}
      </q-chip>
    </template>
  </q-select>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSettingsStore } from 'src/stores/settings'

defineProps<{ modelValue: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [string[]] }>()

const settings = useSettingsStore()
const options = computed(() => settings.knowledgeBases.map(k => ({ label: k.name, value: k.id })))
</script>

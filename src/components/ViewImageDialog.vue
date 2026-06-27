<template>
  <q-dialog
    ref="dialogRef"
    @hide="onDialogHide"
  >
    <q-card class="bg-transparent shadow-none flex items-center justify-center">
      <img
        :src="url"
        class="max-w-90vw max-h-85vh rounded-lg block"
        @click="onDialogOK"
      >
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { useDialogPluginComponent } from 'quasar'

defineProps<{ url: string }>()
defineEmits([...useDialogPluginComponent.emits])

const { dialogRef, onDialogHide, onDialogOK } = useDialogPluginComponent()
</script>

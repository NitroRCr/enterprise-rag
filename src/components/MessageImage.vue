<template>
  <div
    class="relative rounded-md overflow-hidden cursor-pointer"
    @click="viewImage"
  >
    <img
      v-if="url"
      :src="url"
      :alt="image.name"
      :title="image.name"
      class="w-auto h-auto max-w-full max-h-full block"
    >
    <div
      v-if="removable"
      class="bg-gradient-top-a absolute top-0 left-0 right-0 h-30px"
    />
    <q-btn
      v-if="removable"
      icon="sym_o_close"
      class="absolute top-0 right-0 text-0-0-0-a"
      flat
      round
      dense
      size="sm"
      @click.prevent.stop="$emit('remove')"
    />
  </div>
</template>

<script setup lang="ts">
import { toRef } from 'vue'
import { useQuasar } from 'quasar'
import type { StoredItem } from 'src/utils/types'
import { useFileURL } from 'src/composables/useFileURL'
import ViewImageDialog from './ViewImageDialog.vue'

const props = defineProps<{ image: StoredItem; removable?: boolean }>()
defineEmits<{ remove: [] }>()

const url = useFileURL(toRef(props, 'image'))

const $q = useQuasar()
function viewImage() {
  if (!url.value) return
  $q.dialog({ component: ViewImageDialog, componentProps: { url: url.value } })
}
</script>

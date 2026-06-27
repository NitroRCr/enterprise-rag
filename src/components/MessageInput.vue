<template>
  <div class="relative">
    <!-- 附件预览 -->
    <div
      v-if="inputItems.length"
      class="flex items-end gap-2 of-x-auto pb-2 px-1"
    >
      <MessageImage
        v-for="img in inputItems.filter(i => i.mimeType?.startsWith('image/'))"
        :key="img.id"
        :image="img"
        removable
        class="h-80px shrink-0 shadow"
        @remove="removeInputItem(img.id)"
      />
      <MessageFile
        v-for="f in inputItems.filter(i => !i.mimeType?.startsWith('image/'))"
        :key="f.id"
        :file="f"
        removable
        @remove="removeInputItem(f.id)"
      />
    </div>

    <div class="rounded-2xl bg-sur-c border border-out-var p-2 flex items-end gap-1">
      <q-btn
        flat
        round
        dense
        icon="sym_o_image"
        class="text-on-sur-var"
        :disable="disabled"
        title="添加图片"
        @click="imageInput?.click()"
      >
        <input
          ref="imageInput"
          type="file"
          accept="image/*"
          multiple
          hidden
          @change="onPick"
        >
      </q-btn>
      <q-btn
        flat
        round
        dense
        icon="sym_o_attach_file"
        class="text-on-sur-var"
        :disable="disabled"
        title="添加文件"
        @click="fileInput?.click()"
      >
        <input
          ref="fileInput"
          type="file"
          multiple
          hidden
          @change="onPick"
        >
      </q-btn>
      <q-input
        :model-value="inputContent?.text ?? ''"
        type="textarea"
        borderless
        dense
        autogrow
        :debounce="200"
        class="flex-1 px-1 max-h-40 of-auto"
        placeholder="输入你的问题，回车发送（Shift+Enter 换行）"
        :disable="disabled"
        @update:model-value="v => updateInputText(String(v ?? ''))"
        @keydown="onKeydown"
        @paste="onPaste"
      />
      <q-btn
        v-if="generating"
        round
        unelevated
        color="err"
        text-color="on-err"
        icon="sym_o_stop"
        title="停止"
        @click="stop"
      />
      <q-btn
        v-else
        round
        unelevated
        color="pri"
        text-color="on-pri"
        icon="sym_o_arrow_upward"
        :disable="inputEmpty || disabled"
        @click="send"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useChat } from 'src/composables/useChat'
import MessageImage from './MessageImage.vue'
import MessageFile from './MessageFile.vue'

defineProps<{ disabled?: boolean }>()

const {
  inputContent, inputItems, inputEmpty, generating,
  updateInputText, addFiles, removeInputItem, send, stop
} = useChat()

const imageInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()

function onPick(e: Event) {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files ?? [])
  if (files.length) addFiles(files)
  target.value = ''
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault()
    send()
  }
}

function onPaste(e: ClipboardEvent) {
  const files = Array.from(e.clipboardData?.files ?? [])
  if (files.length) {
    e.preventDefault()
    addFiles(files)
  }
}
</script>

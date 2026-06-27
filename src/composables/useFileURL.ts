import { onUnmounted, ref, watch, type Ref } from 'vue'

/**
 * 为附件条目（图片/文件）生成临时 blob URL，组件卸载时自动释放。
 */
export function useFileURL(source: Ref<{ contentBuffer?: ArrayBuffer; mimeType?: string } | undefined>) {
  const url = ref<string>()

  function revoke() {
    if (url.value) {
      URL.revokeObjectURL(url.value)
      url.value = undefined
    }
  }

  watch(source, val => {
    revoke()
    if (val?.contentBuffer) {
      const blob = new Blob([val.contentBuffer], { type: val.mimeType || 'application/octet-stream' })
      url.value = URL.createObjectURL(blob)
    }
  }, { immediate: true })

  onUnmounted(revoke)

  return url
}

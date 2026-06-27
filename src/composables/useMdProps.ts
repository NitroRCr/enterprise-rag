import { config, type MdPreviewProps, XSSPlugin } from 'md-editor-v3'
import { computed } from 'vue'
import { Dark } from 'quasar'
import { genId } from 'app/src-shared/utils/id'

// 全局配置 md-editor-v3：启用内置 XSS 过滤（渲染模型输出更安全）
let configured = false
function ensureConfig() {
  if (configured) return
  configured = true
  config({
    markdownItPlugins(plugins) {
      return [
        ...plugins,
        { type: 'xss', plugin: XSSPlugin, options: {} }
      ]
    }
  })
}

const mdHeadingId = ({ text, level, index }: { text: string; level: number; index: number }) =>
  `h-${level}-${index}-${text}`

/** Markdown 预览 + 目录（ToC）所需 props。每个消息一个独立 editor id。 */
export function useMdProps() {
  ensureConfig()
  const id = `md-${genId()}`
  const isDark = computed(() => Dark.isActive)
  return {
    mdId: id,
    mdPreviewProps: computed(() => ({
      id,
      theme: isDark.value ? 'dark' : 'light',
      previewTheme: 'default',
      codeTheme: 'atom',
      showCodeRowNumber: false,
      mdHeadingId
    } satisfies Partial<MdPreviewProps>)),
    mdCatalogProps: computed(() => ({
      editorId: id,
      mdHeadingId
    }))
  }
}

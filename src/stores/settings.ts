import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, unwrap } from 'src/utils/hc'
import type { KnowledgeBase, Model } from 'app/src-shared/utils/types'

export const useSettingsStore = defineStore('settings', () => {
  const siteName = ref('企业知识库')
  const knowledgeBases = ref<KnowledgeBase[]>([])
  const models = ref<(Model & { providerEnabled?: boolean })[]>([])
  const defaultModelName = ref<string | null>(null)
  const defaultKnowledgeBaseId = ref<string | null>(null)
  const loaded = ref(false)

  async function load() {
    const [kbs, ms, settings] = await Promise.all([
      unwrap<KnowledgeBase[]>(await api['knowledge-bases'].$get()),
      unwrap<(Model & { providerEnabled?: boolean })[]>(await api.models.$get()),
      unwrap<{ defaultModelName: string | null; defaultKnowledgeBaseId: string | null }>(await api.settings.$get())
    ])
    knowledgeBases.value = kbs
    models.value = ms
    defaultModelName.value = settings.defaultModelName
    defaultKnowledgeBaseId.value = settings.defaultKnowledgeBaseId
    loaded.value = true
  }

  return { siteName, knowledgeBases, models, defaultModelName, defaultKnowledgeBaseId, loaded, load }
})

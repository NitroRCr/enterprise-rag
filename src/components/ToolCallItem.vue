<template>
  <div class="rounded-lg bg-sur-c-high of-hidden text-sm">
    <div class="flex items-center gap-2 px-3 py-2 cursor-pointer select-none" @click="open = !open">
      <q-icon :name="icon" size="18px" class="text-pri" />
      <span class="font-500">{{ title }}</span>
      <span class="text-on-sur-var truncate flex-1 min-w-0">{{ subtitle }}</span>
      <q-spinner v-if="call.status === 'calling'" size="16px" class="text-pri" />
      <q-icon v-else-if="call.status === 'failed'" name="sym_o_error" size="18px" class="text-err" />
      <q-icon v-else name="sym_o_check_circle" size="18px" class="text-suc" />
      <q-icon :name="open ? 'sym_o_expand_less' : 'sym_o_expand_more'" size="18px" class="text-on-sur-var" />
    </div>

    <q-slide-transition>
      <div v-show="open" class="px-3 pb-3 border-t border-out-var">
        <div v-if="call.error" class="text-err py-2">{{ call.error }}</div>

        <!-- 搜索结果 -->
        <div v-else-if="searchResults" class="flex flex-col gap-2 pt-2">
          <div v-if="searchResults.length === 0" class="text-on-sur-var py-1">未找到相关文档</div>
          <div
            v-for="r in searchResults" :key="r.id"
            class="rounded-md bg-sur-c p-2 cursor-pointer hover:bg-sur-c-highest transition-colors"
            @click="goDoc(r.id)"
          >
            <div class="flex items-center gap-1 font-500 text-pri">
              <q-icon name="sym_o_description" size="16px" />
              <span class="truncate">{{ r.name }}</span>
            </div>
            <div class="text-xs text-on-sur-var mt-1 snippet" v-html="r.snippet" />
          </div>
        </div>

        <!-- 取文档结果 -->
        <div v-else-if="docs" class="flex flex-col gap-1 pt-2">
          <div
            v-for="d in docs" :key="d.id"
            class="flex items-center gap-1 text-pri cursor-pointer hover:underline"
            @click="goDoc(d.id)"
          >
            <q-icon name="sym_o_article" size="16px" />
            <span class="truncate">{{ d.name }}</span>
          </div>
        </div>
      </div>
    </q-slide-transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { ToolCallRecord } from 'src/utils/types'
import type { SearchResult } from 'app/src-shared/utils/types'

const props = defineProps<{ call: ToolCallRecord }>()
const router = useRouter()
const open = ref(false)

const isSearch = computed(() => props.call.name === 'search')
const icon = computed(() => (isSearch.value ? 'sym_o_search' : 'sym_o_article'))
const title = computed(() => (isSearch.value ? '搜索知识库' : '获取文档'))
const subtitle = computed(() => {
  if (isSearch.value) return String(props.call.args.query ?? '')
  const ids = props.call.args.ids as string[] | undefined
  return ids ? `${ids.length} 个文档` : ''
})

const searchResults = computed<SearchResult[] | null>(() => {
  if (!isSearch.value) return null
  const res = props.call.result as { results?: SearchResult[] } | undefined
  return res?.results ?? []
})
const docs = computed<{ id: string; name: string }[] | null>(() => {
  if (isSearch.value) return null
  const res = props.call.result as { documents?: { id: string; name: string }[] } | undefined
  return res?.documents ?? []
})

function goDoc(id: string) {
  router.push(`/doc/${id}`)
}
</script>

<style scoped>
.snippet :deep(mark) {
  background-color: var(--a-ter-c);
  color: var(--a-on-ter-c);
  border-radius: 2px;
  padding: 0 2px;
}
</style>

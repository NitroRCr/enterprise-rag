<template>
  <q-page class="p-4">
    <!-- 标题 + 粒度切换 -->
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <div class="text-xl font-600">
        概览
      </div>
      <q-btn-toggle
        v-model="granularity"
        :options="granularityOptions"
        no-caps
        unelevated
        toggle-color="pri"
        toggle-text-color="on-pri"
        color="sur-c-high"
        text-color="on-sur-var"
        class="rounded-lg"
        @update:model-value="loadCalls"
      />
    </div>

    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-4">
      <q-card
        v-for="s in statCards"
        :key="s.label"
        flat
        class="bg-sur-c rounded-xl transition-all hover:shadow-lg hover:-translate-y-0.5"
      >
        <q-card-section class="p-4">
          <div class="flex items-center gap-2 text-on-sur-var mb-2">
            <q-icon
              :name="s.icon"
              size="20px"
              class="text-pri"
            />
            <span class="text-xs">{{ s.label }}</span>
          </div>
          <div class="text-2xl font-700 text-on-sur">
            {{ s.value }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <!-- 图表 -->
    <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <q-card
        flat
        class="bg-sur-c rounded-xl"
      >
        <q-card-section>
          <div class="text-base font-600 mb-1">
            知识库调用量
          </div>
          <div class="text-xs text-on-sur-var mb-2">
            按知识库分段，悬停查看满意度
          </div>
          <v-chart
            class="h-80"
            :option="kbOption"
            :theme="chartTheme"
            autoresize
          />
        </q-card-section>
      </q-card>

      <q-card
        flat
        class="bg-sur-c rounded-xl"
      >
        <q-card-section>
          <div class="text-base font-600 mb-1">
            模型调用量
          </div>
          <div class="text-xs text-on-sur-var mb-2">
            按模型分段统计调用次数
          </div>
          <v-chart
            class="h-80"
            :option="modelOption"
            :theme="chartTheme"
            autoresize
          />
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Dark, Notify } from 'quasar'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'
import { api, unwrap } from 'src/utils/hc'
import type { CallSeries, KbSatisfaction, OverviewStats } from 'app/src-shared/utils/types'

use([BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer])

type Granularity = 'day' | 'week' | 'month'

const PALETTE = ['#4655F5', '#6750A4', '#0EA5A4', '#2E9B5B', '#E0A008', '#D14343', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

const granularity = ref<Granularity>('day')
const granularityOptions = [
  { label: '日', value: 'day' },
  { label: '周', value: 'week' },
  { label: '月', value: 'month' }
]

const stats = ref<OverviewStats | null>(null)
const kbSeries = ref<CallSeries>({ keys: [], labels: {}, points: [] })
const modelSeries = ref<CallSeries>({ keys: [], labels: {}, points: [] })
const satisfaction = ref<KbSatisfaction[]>([])

const chartTheme = computed(() => (Dark.isActive ? 'dark' : undefined))

const statCards = computed(() => {
  const s = stats.value
  const pct = s?.satisfaction != null ? `${Math.round(s.satisfaction * 100)}%` : '—'
  return [
    { label: '文档数', value: s?.documentCount ?? 0, icon: 'sym_o_description' },
    { label: '用户数', value: s?.userCount ?? 0, icon: 'sym_o_group' },
    { label: '知识库数', value: s?.knowledgeBaseCount ?? 0, icon: 'sym_o_menu_book' },
    { label: '部门数', value: s?.departmentCount ?? 0, icon: 'sym_o_apartment' },
    { label: '总调用量', value: (s?.modelCallCount ?? 0) + (s?.kbCallCount ?? 0), icon: 'sym_o_bolt' },
    { label: '整体满意度', value: pct, icon: 'sym_o_sentiment_satisfied' }
  ]
})

const satisfactionMap = computed(() => {
  const map = new Map<string, number | null>()
  for (const k of satisfaction.value) map.set(k.knowledgeBaseId, k.rate)
  return map
})

function buildStackedOption(series: CallSeries, opts: { withSatisfaction?: boolean }) {
  const buckets = series.points.map(p => p.bucket)
  const barSeries = series.keys.map((key, i) => ({
    name: series.labels[key] ?? key,
    type: 'bar' as const,
    stack: 'total',
    emphasis: { focus: 'series' as const },
    itemStyle: { color: PALETTE[i % PALETTE.length], borderRadius: [2, 2, 0, 0] },
    data: series.points.map(p => p.counts[key] ?? 0),
    // 携带 key 便于 tooltip 查满意度
    _key: key
  }))
  interface TooltipParam { axisValue: string; marker: string; seriesName: string; seriesIndex: number; value: number }
  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: TooltipParam[]) => {
        if (!params.length) return ''
        let html = `<div style="font-weight:600;margin-bottom:4px">${params[0].axisValue}</div>`
        for (const p of params) {
          if (!p.value) continue
          let extra = ''
          if (opts.withSatisfaction) {
            const key = barSeries[p.seriesIndex]?._key
            const rate = key ? satisfactionMap.value.get(key) : undefined
            extra = rate != null ? ` · 满意度 ${Math.round(rate * 100)}%` : ' · 暂无反馈'
          }
          html += `<div>${p.marker}${p.seriesName}: <b>${p.value}</b>${extra}</div>`
        }
        return html
      }
    },
    legend: { type: 'scroll', bottom: 0, textStyle: { fontSize: 11 } },
    grid: { left: 8, right: 12, top: 16, bottom: 40, containLabel: true },
    xAxis: { type: 'category', data: buckets, axisTick: { show: false } },
    yAxis: { type: 'value', minInterval: 1 },
    series: barSeries
  }
}

const kbOption = computed(() => buildStackedOption(kbSeries.value, { withSatisfaction: true }))
const modelOption = computed(() => buildStackedOption(modelSeries.value, {}))

async function loadCalls() {
  const [kb, md] = await Promise.all([
    unwrap<CallSeries>(await api.analytics.calls.$get({ query: { granularity: granularity.value, dimension: 'kb' } })),
    unwrap<CallSeries>(await api.analytics.calls.$get({ query: { granularity: granularity.value, dimension: 'model' } }))
  ])
  kbSeries.value = kb
  modelSeries.value = md
}

async function loadAll() {
  try {
    const [ov, sat] = await Promise.all([
      unwrap<OverviewStats>(await api.analytics.overview.$get()),
      unwrap<KbSatisfaction[]>(await api.analytics.satisfaction.$get())
    ])
    stats.value = ov
    satisfaction.value = sat
    await loadCalls()
  } catch (e) {
    Notify.create({ message: (e as Error).message, color: 'err', textColor: 'on-err' })
  }
}

onMounted(loadAll)
</script>

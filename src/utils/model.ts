import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

// 指向服务端 OpenAI 兼容代理（dev 经 quasar 代理 /api → 服务端 /api/v1）
const provider = createOpenAICompatible({
  name: 'enterprise-rag-server',
  baseURL: `${location.origin}/api/v1`,
  includeUsage: true,
  // 确保携带 better-auth 会话 Cookie
  fetch: ((input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, credentials: 'include' })) as typeof fetch
})

export function getModel(modelName: string) {
  return provider.languageModel(modelName)
}
